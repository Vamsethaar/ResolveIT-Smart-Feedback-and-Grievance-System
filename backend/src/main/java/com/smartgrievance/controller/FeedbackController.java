package com.smartgrievance.controller;

import com.smartgrievance.dto.FeedbackDtos;
import com.smartgrievance.model.Feedback;
import com.smartgrievance.model.FeedbackStatus;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.UserRepository;
import com.smartgrievance.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin
public class FeedbackController {
    private final FeedbackService feedbackService;
    private final UserRepository userRepository;

    public FeedbackController(FeedbackService feedbackService, UserRepository userRepository) {
        this.feedbackService = feedbackService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<Long> submit(@AuthenticationPrincipal UserDetails principal, @Valid @RequestBody FeedbackDtos.SubmitRequest req) {
        User citizen = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Feedback f = feedbackService.submit(citizen, req);
        return ResponseEntity.ok(f.getId());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<List<FeedbackDtos.FeedbackResponse>> my(@AuthenticationPrincipal UserDetails principal) {
        User citizen = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(feedbackService.my(citizen));
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<List<FeedbackDtos.OfficerItem>> assigned(@AuthenticationPrincipal UserDetails principal) {
        User officer = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        List<Feedback> list = feedbackService.assignedTo(officer);
        List<FeedbackDtos.OfficerItem> out = list.stream().map(f -> {
            boolean anon = f.isAnonymous();
            String citizenName = anon ? "Anonymous user" : (f.getCitizen() != null ? f.getCitizen().getName() : "");
            String citizenEmail = anon ? "" : (f.getCitizen() != null ? f.getCitizen().getEmail() : "");
            return new FeedbackDtos.OfficerItem(
                    f.getId(),
                    f.getTitle(),
                    f.getStatus().name(),
                    f.getType() != null ? f.getType().name() : null,
                    f.getSubmissionType() != null ? f.getSubmissionType().name() : "FEEDBACK",
                    fmt.format(f.getUpdatedAt()),
                    citizenName,
                    citizenEmail,
                    anon,
                    f.getDeadline() != null ? f.getDeadline().toString() : null,
                    f.getEscalationLevel(),
                    f.getPhotoUrl(),
                    f.getAdminMessage(),
                    f.getRating(),
                    f.getRatingComment()
            );
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OFFICER','ADMIN')")
    public ResponseEntity<Feedback> updateStatus(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id, @RequestParam FeedbackStatus status) {
        User actor = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(feedbackService.updateStatus(actor, id, status));
    }

    @GetMapping("/assigned/counts")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<com.smartgrievance.service.FeedbackService.Counts> officerCounts(@AuthenticationPrincipal UserDetails principal) {
        User officer = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(feedbackService.officerCounts(officer));
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<Feedback> escalate(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        User citizen = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Feedback f = feedbackService.escalateToAdmin(citizen, id);
        return ResponseEntity.ok(f);
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('OFFICER')")
    public ResponseEntity<FeedbackDtos.StatisticsResponse> officerStatistics(@AuthenticationPrincipal UserDetails principal) {
        User officer = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(feedbackService.getOfficerStatistics(officer));
    }

    @PostMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<Feedback> withdraw(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        User citizen = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(feedbackService.withdraw(citizen, id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OFFICER')")
    public ResponseEntity<Void> deleteFeedback(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        User actor = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        feedbackService.deleteFeedback(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/rating")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<Feedback> submitRating(@AuthenticationPrincipal UserDetails principal,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody FeedbackDtos.RatingRequest req) {
        User citizen = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Feedback f = feedbackService.submitRating(citizen, id, req);
        return ResponseEntity.ok(f);
    }

    @GetMapping("/officer/{email}/rating")
    public ResponseEntity<FeedbackDtos.OfficerRatingResponse> getOfficerRating(@PathVariable String email) {
        return ResponseEntity.ok(feedbackService.getOfficerRating(email));
    }
}




