package com.smartgrievance.service;

import com.smartgrievance.dto.FeedbackDtos;
import com.smartgrievance.model.Feedback;
import com.smartgrievance.model.FeedbackStatus;
import com.smartgrievance.model.FeedbackType;
import com.smartgrievance.model.Role;
import com.smartgrievance.model.SubmissionType;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.FeedbackRepository;
import com.smartgrievance.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FeedbackService {
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public FeedbackService(FeedbackRepository feedbackRepository, UserRepository userRepository) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    public Feedback submit(User citizen, FeedbackDtos.SubmitRequest req) {
        // Exactly one visibility option must be chosen
        boolean publicChosen = req.isPublic();
        boolean anonymousChosen = req.isAnonymous();
        if (publicChosen == anonymousChosen) { // both true or both false
            throw new IllegalArgumentException("Choose either public or anonymous");
        }
        Feedback f = new Feedback();
        f.setTitle(req.title());
        f.setDescription(req.description());
        f.setPublic(req.isPublic());
        f.setAnonymous(req.isAnonymous());
        f.setPhotoUrl(req.photoUrl());
        FeedbackType type = req.type() == null ? FeedbackType.OTHERS : req.type();
        f.setType(type);
        SubmissionType submissionType = req.submissionType() == null ? SubmissionType.FEEDBACK : req.submissionType();
        f.setSubmissionType(submissionType);
        // For grievances, deadline will be set by admin later
        // For feedback, no deadline
        f.setCitizen(citizen);
        return feedbackRepository.save(f);
    }

    public List<FeedbackDtos.FeedbackResponse> my(User citizen) {
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        return feedbackRepository.findByCitizen(citizen).stream()
                .map(f -> new FeedbackDtos.FeedbackResponse(
                        f.getId(), 
                        f.getTitle(),
                        f.getDescription(),
                        f.getStatus().name(),
                        f.getType() != null ? f.getType().name() : FeedbackType.OTHERS.name(),
                        f.getSubmissionType() != null ? f.getSubmissionType().name() : SubmissionType.FEEDBACK.name(),
                        fmt.format(f.getCreatedAt()), 
                        fmt.format(f.getUpdatedAt()),
                        f.getDeadline() != null ? f.getDeadline().toString() : null,
                        f.getEscalationLevel(),
                        f.getPhotoUrl(),
                        f.getAdminMessage(),
                        f.getRating(),
                        f.getRatingComment(),
                        f.getAssignedOfficer() != null ? f.getAssignedOfficer().getName() : null,
                        f.getAssignedOfficer() != null ? f.getAssignedOfficer().getEmail() : null
                ))
                .collect(Collectors.toList());
    }

    public List<Feedback> assignedTo(User officer) {
        // Officers can only view feedbacks assigned to them
        return feedbackRepository.findByAssignedOfficer(officer);
    }

    public List<Feedback> findAll() {
        return feedbackRepository.findAll();
    }

    public Feedback updateStatus(User actor, Long id, FeedbackStatus status) {
        Feedback f = feedbackRepository.findById(id).orElseThrow();
        // Officers can manage only feedbacks assigned to them
        if (actor.getRole() == Role.OFFICER) {
            if (f.getAssignedOfficer() == null || !f.getAssignedOfficer().getId().equals(actor.getId())) {
                throw new IllegalStateException("Not authorized to update this feedback");
            }
        }
        // Officers cannot set status to ESCALATED
        if (actor.getRole() == Role.OFFICER && status == FeedbackStatus.ESCALATED) {
            throw new IllegalStateException("Officers cannot set status to ESCALATED");
        }
        f.setStatus(status);
        return feedbackRepository.save(f);
    }

    public Feedback assignToOfficer(User admin, Long feedbackId, Long officerId) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin can assign feedbacks");
        }
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        User officer = userRepository.findById(officerId).orElseThrow();
        if (officer.getRole() != Role.OFFICER) {
            throw new IllegalArgumentException("Assignee must be an OFFICER");
        }
        feedback.setAssignedOfficer(officer);
        // Set status to IN_PROGRESS if it's SUBMITTED or ESCALATED
        if (feedback.getStatus() == FeedbackStatus.SUBMITTED || feedback.getStatus() == FeedbackStatus.ESCALATED) {
            feedback.setStatus(FeedbackStatus.IN_PROGRESS);
        }
        return feedbackRepository.save(feedback);
    }

    public Feedback assignDeadline(User admin, Long feedbackId, String deadlineStr) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin can assign deadlines");
        }
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        if (feedback.getSubmissionType() != SubmissionType.GRIEVANCE) {
            throw new IllegalArgumentException("Deadlines can only be assigned to grievances");
        }
        // Parse ISO local datetime string (YYYY-MM-DDTHH:mm) or fallback to date-only (treated as end-of-day)
        LocalDateTime deadline;
        try {
            if (deadlineStr.contains("T")) {
                deadline = LocalDateTime.parse(deadlineStr.replace(" ", "T"));
            } else {
                // treat a date-only as end of that day 23:59
                LocalDate d = LocalDate.parse(deadlineStr);
                deadline = d.atTime(23, 59);
            }
            if (deadline.isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Deadline cannot be in the past");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid deadline format: " + e.getMessage());
        }
        feedback.setDeadline(deadline);
        return feedbackRepository.save(feedback);
    }

    public Feedback escalateToAdmin(User citizen, Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        // Verify it belongs to the citizen
        if (!feedback.getCitizen().getId().equals(citizen.getId())) {
            throw new IllegalStateException("Not authorized to escalate this feedback");
        }
        // Only grievances can be escalated
        if (feedback.getSubmissionType() != SubmissionType.GRIEVANCE) {
            throw new IllegalArgumentException("Only grievances can be escalated");
        }
        // Check if deadline has passed
        if (feedback.getDeadline() == null || feedback.getDeadline().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Deadline has not passed yet");
        }
        // Check if already resolved
        if (feedback.getStatus() == FeedbackStatus.RESOLVED) {
            throw new IllegalStateException("Cannot escalate resolved grievance");
        }
        // Set status to escalated and increment escalation level
        feedback.setStatus(FeedbackStatus.ESCALATED);
        feedback.setEscalationLevel(feedback.getEscalationLevel() + 1);
        // Unassign officer so admin can reassign
        feedback.setAssignedOfficer(null);
        return feedbackRepository.save(feedback);
    }

    public Feedback withdraw(User citizen, Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        // Verify it belongs to the citizen
        if (!feedback.getCitizen().getId().equals(citizen.getId())) {
            throw new IllegalStateException("Not authorized to withdraw this feedback");
        }
        // Only allow withdrawal when status is SUBMITTED
        if (feedback.getStatus() != FeedbackStatus.SUBMITTED) {
            throw new IllegalStateException("Can only withdraw feedback with SUBMITTED status");
        }
        feedback.setStatus(FeedbackStatus.WITHDRAWN);
        return feedbackRepository.save(feedback);
    }

    public void deleteFeedback(User actor, Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        // Officers can only delete feedbacks assigned to them
        if (actor.getRole() == Role.OFFICER) {
            if (feedback.getAssignedOfficer() == null || !feedback.getAssignedOfficer().getId().equals(actor.getId())) {
                throw new IllegalStateException("Not authorized to delete this feedback");
            }
        }
        // Admin can delete any feedback
        // Officers can delete assigned feedbacks
        feedbackRepository.delete(feedback);
    }

    public Feedback sendAdminMessage(User admin, Long feedbackId, String message) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin can send messages");
        }
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        // Only allow sending message to escalated feedbacks
        if (feedback.getStatus() != FeedbackStatus.ESCALATED) {
            throw new IllegalStateException("Can only send message for escalated feedbacks");
        }
        feedback.setAdminMessage(message);
        return feedbackRepository.save(feedback);
    }

    public record Counts(long unresolved, long assigned, long rejected, long total) {}

    public Counts adminCounts() {
        long total = feedbackRepository.count();
        long rejected = feedbackRepository.countByStatus(FeedbackStatus.REJECTED);
        long assigned = feedbackRepository.countByAssignedOfficerNotNull();
        long unresolved = feedbackRepository.countByStatuses(java.util.List.of(FeedbackStatus.SUBMITTED, FeedbackStatus.IN_PROGRESS));
        return new Counts(unresolved, assigned, rejected, total);
    }

    public Counts officerCounts(User officer) {
        long total = feedbackRepository.findByAssignedOfficer(officer).size();
        long rejected = feedbackRepository.countByAssignedOfficerAndStatus(officer, FeedbackStatus.REJECTED);
        long assigned = total; // by definition for officer scope
        long unresolved = feedbackRepository.countByOfficerAndStatuses(officer, java.util.List.of(FeedbackStatus.SUBMITTED, FeedbackStatus.IN_PROGRESS));
        return new Counts(unresolved, assigned, rejected, total);
    }

    public FeedbackDtos.StatisticsResponse getAdminStatistics() {
        List<Feedback> all = feedbackRepository.findAll();
        
        long totalGrievances = all.stream().filter(f -> f.getSubmissionType() == SubmissionType.GRIEVANCE).count();
        long totalFeedbacks = all.stream().filter(f -> f.getSubmissionType() == SubmissionType.FEEDBACK).count();
        long submitted = all.stream().filter(f -> f.getStatus() == FeedbackStatus.SUBMITTED).count();
        long inProgress = all.stream().filter(f -> f.getStatus() == FeedbackStatus.IN_PROGRESS).count();
        long resolved = all.stream().filter(f -> f.getStatus() == FeedbackStatus.RESOLVED).count();
        long rejected = all.stream().filter(f -> f.getStatus() == FeedbackStatus.REJECTED).count();
        long escalated = all.stream().filter(f -> f.getStatus() == FeedbackStatus.ESCALATED).count();
        
        Map<String, Long> statusDistribution = new HashMap<>();
        for (FeedbackStatus status : FeedbackStatus.values()) {
            statusDistribution.put(status.name(), all.stream().filter(f -> f.getStatus() == status).count());
        }
        
        Map<String, Long> typeDistribution = new HashMap<>();
        for (FeedbackType type : FeedbackType.values()) {
            typeDistribution.put(type.name(), all.stream().filter(f -> f.getType() == type).count());
        }
        
        Map<String, Long> submissionTypeDistribution = new HashMap<>();
        submissionTypeDistribution.put("GRIEVANCE", totalGrievances);
        submissionTypeDistribution.put("FEEDBACK", totalFeedbacks);
        
        return new FeedbackDtos.StatisticsResponse(
            totalGrievances, totalFeedbacks, submitted, inProgress, resolved, rejected, escalated,
            statusDistribution, typeDistribution, submissionTypeDistribution
        );
    }

    public FeedbackDtos.StatisticsResponse getOfficerStatistics(User officer) {
        List<Feedback> assigned = feedbackRepository.findByAssignedOfficer(officer);
        
        long totalGrievances = assigned.stream().filter(f -> f.getSubmissionType() == SubmissionType.GRIEVANCE).count();
        long totalFeedbacks = assigned.stream().filter(f -> f.getSubmissionType() == SubmissionType.FEEDBACK).count();
        long submitted = assigned.stream().filter(f -> f.getStatus() == FeedbackStatus.SUBMITTED).count();
        long inProgress = assigned.stream().filter(f -> f.getStatus() == FeedbackStatus.IN_PROGRESS).count();
        long resolved = assigned.stream().filter(f -> f.getStatus() == FeedbackStatus.RESOLVED).count();
        long rejected = assigned.stream().filter(f -> f.getStatus() == FeedbackStatus.REJECTED).count();
        long escalated = assigned.stream().filter(f -> f.getStatus() == FeedbackStatus.ESCALATED).count();
        
        Map<String, Long> statusDistribution = new HashMap<>();
        for (FeedbackStatus status : FeedbackStatus.values()) {
            statusDistribution.put(status.name(), assigned.stream().filter(f -> f.getStatus() == status).count());
        }
        
        Map<String, Long> typeDistribution = new HashMap<>();
        for (FeedbackType type : FeedbackType.values()) {
            typeDistribution.put(type.name(), assigned.stream().filter(f -> f.getType() == type).count());
        }
        
        Map<String, Long> submissionTypeDistribution = new HashMap<>();
        submissionTypeDistribution.put("GRIEVANCE", totalGrievances);
        submissionTypeDistribution.put("FEEDBACK", totalFeedbacks);
        
        return new FeedbackDtos.StatisticsResponse(
            totalGrievances, totalFeedbacks, submitted, inProgress, resolved, rejected, escalated,
            statusDistribution, typeDistribution, submissionTypeDistribution
        );
    }

    public Feedback submitRating(User citizen, Long feedbackId, FeedbackDtos.RatingRequest req) {
        Feedback feedback = feedbackRepository.findById(feedbackId).orElseThrow();
        // Verify it belongs to the citizen
        if (!feedback.getCitizen().getId().equals(citizen.getId())) {
            throw new IllegalStateException("Not authorized to rate this feedback");
        }
        // Only allow rating when status is RESOLVED
        if (feedback.getStatus() != FeedbackStatus.RESOLVED) {
            throw new IllegalStateException("Can only rate resolved feedbacks");
        }
        // Validate rating is between 1 and 5
        if (req.rating() == null || req.rating() < 1 || req.rating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        feedback.setRating(req.rating());
        feedback.setRatingComment(req.comment());
        return feedbackRepository.save(feedback);
    }

    public FeedbackDtos.OfficerRatingResponse getOfficerRating(String officerEmail) {
        User officer = userRepository.findByEmail(officerEmail).orElse(null);
        if (officer == null) {
            return new FeedbackDtos.OfficerRatingResponse(officerEmail, null, 0L);
        }
        List<Feedback> resolvedFeedbacks = feedbackRepository.findByAssignedOfficerAndStatus(officer, FeedbackStatus.RESOLVED);
        List<Feedback> ratedFeedbacks = resolvedFeedbacks.stream()
                .filter(f -> f.getRating() != null)
                .collect(Collectors.toList());
        
        if (ratedFeedbacks.isEmpty()) {
            return new FeedbackDtos.OfficerRatingResponse(officerEmail, null, 0L);
        }
        
        double averageRating = ratedFeedbacks.stream()
                .mapToInt(Feedback::getRating)
                .average()
                .orElse(0.0);
        
        return new FeedbackDtos.OfficerRatingResponse(officerEmail, averageRating, (long) ratedFeedbacks.size());
    }
}




