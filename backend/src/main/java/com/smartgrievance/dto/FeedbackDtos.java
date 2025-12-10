package com.smartgrievance.dto;

import com.smartgrievance.model.FeedbackType;
import com.smartgrievance.model.SubmissionType;
import jakarta.validation.constraints.NotBlank;

public class FeedbackDtos {
    public record SubmitRequest(@NotBlank String title,
                                @NotBlank String description,
                                boolean isPublic,
                                boolean isAnonymous,
                                String photoUrl,
                                FeedbackType type,
                                SubmissionType submissionType) {}
    
    public record FeedbackResponse(Long id, 
                                   String title,
                                   String description,
                                   String status, 
                                   String type, 
                                   String submissionType,
                                   String createdAt, 
                                   String lastUpdatedAt,
                                   String deadline,
                                   Integer escalationLevel,
                                   String photoUrl,
                                   String adminMessage,
                                   Integer rating,
                                   String ratingComment,
                                   String officerName,
                                   String officerEmail) {}

    public record OfficerItem(Long id,
                              String title,
                              String status,
                              String type,
                              String submissionType,
                              String updatedAt,
                              String citizenName,
                              String citizenEmail,
                              boolean anonymous,
                              String deadline,
                              Integer escalationLevel,
                              String photoUrl,
                              String adminMessage,
                              Integer rating,
                              String ratingComment) {}

    public record AdminItem(Long id,
                            String title,
                            String status,
                            String type,
                            String submissionType,
                            String updatedAt,
                            String citizenName,
                            String citizenEmail,
                            boolean anonymous,
                            String officerEmail,
                            String deadline,
                            Integer escalationLevel,
                            String photoUrl,
                            String adminMessage,
                            Integer rating,
                            String ratingComment) {}
    
    public record DeadlineRequest(String deadline) {} // ISO date string format
    
    public record AdminMessageRequest(String message) {} // Message from admin to officer
    
    public record RatingRequest(Integer rating, String comment) {} // Rating 1-5 and optional comment
    
    public record OfficerRatingResponse(String officerEmail, Double averageRating, Long totalRatings) {}
    
    public record StatisticsResponse(Long totalGrievances,
                                     Long totalFeedbacks,
                                     Long submitted,
                                     Long inProgress,
                                     Long resolved,
                                     Long rejected,
                                     Long escalated,
                                     java.util.Map<String, Long> statusDistribution,
                                     java.util.Map<String, Long> typeDistribution,
                                     java.util.Map<String, Long> submissionTypeDistribution) {}
}




