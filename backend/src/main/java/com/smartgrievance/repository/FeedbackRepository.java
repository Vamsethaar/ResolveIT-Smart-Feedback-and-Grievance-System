package com.smartgrievance.repository;

import com.smartgrievance.model.Feedback;
import com.smartgrievance.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.smartgrievance.model.FeedbackStatus;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // Find feedbacks created by a specific citizen
    List<Feedback> findByCitizen(User citizen);

    // Find feedbacks assigned to a specific officer
    List<Feedback> findByAssignedOfficer(User officer);
    
    // Find feedbacks assigned to a specific officer with a specific status
    List<Feedback> findByAssignedOfficerAndStatus(User officer, FeedbackStatus status);

    // Counts for admin
    long countByStatus(FeedbackStatus status);
    long countByAssignedOfficerNotNull();

    // Counts scoped to officer
    long countByAssignedOfficerAndStatus(User officer, FeedbackStatus status);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.status IN (:statuses)")
    long countByStatuses(@Param("statuses") java.util.Collection<FeedbackStatus> statuses);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.assignedOfficer = :officer AND f.status IN (:statuses)")
    long countByOfficerAndStatuses(@Param("officer") User officer, @Param("statuses") java.util.Collection<FeedbackStatus> statuses);
}
