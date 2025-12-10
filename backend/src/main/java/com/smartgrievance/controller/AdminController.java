package com.smartgrievance.controller;

import com.smartgrievance.dto.AdminDtos;
import com.smartgrievance.dto.FeedbackDtos;
import com.smartgrievance.model.Feedback;
import com.smartgrievance.model.Role;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.UserRepository;
import com.smartgrievance.service.FeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository userRepository;
    private final FeedbackService feedbackService;
    private final PasswordEncoder passwordEncoder;

    public AdminController(UserRepository userRepository, FeedbackService feedbackService, PasswordEncoder passwordEncoder) { this.userRepository = userRepository; this.feedbackService = feedbackService; this.passwordEncoder = passwordEncoder; }

    @GetMapping("/users")
    public ResponseEntity<List<User>> users() { return ResponseEntity.ok(userRepository.findAll()); }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@Valid @RequestBody AdminDtos.CreateUserRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().build();
        }
        User u = new User();
        u.setName(req.name());
        u.setEmail(req.email());
        u.setPassword(passwordEncoder.encode(req.password()));
        u.setRole(req.role() == null ? Role.CITIZEN : req.role());
        return ResponseEntity.ok(userRepository.save(u));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody AdminDtos.UpdateUserRequest req) {
        User u = userRepository.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        // unique email check if changed
        if (!u.getEmail().equals(req.email()) && userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().build();
        }
        u.setName(req.name());
        u.setEmail(req.email());
        if (req.role() != null) u.setRole(req.role());
        if (req.password() != null && !req.password().isEmpty()) {
            u.setPassword(passwordEncoder.encode(req.password()));
        }
        return ResponseEntity.ok(userRepository.save(u));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> setRole(@PathVariable Long id, @RequestParam Role role) {
        User u = userRepository.findById(id).orElseThrow();
        u.setRole(role);
        return ResponseEntity.ok(userRepository.save(u));
    }

    @GetMapping("/officers")
    public ResponseEntity<java.util.List<User>> officers() { return ResponseEntity.ok(userRepository.findByRole(Role.OFFICER)); }

    @GetMapping("/feedbacks")
    public ResponseEntity<java.util.List<FeedbackDtos.AdminItem>> allFeedbacks() {
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        java.util.List<FeedbackDtos.AdminItem> out = feedbackService.findAll().stream().map(f -> {
            boolean anon = f.isAnonymous();
            String citizenName = anon ? "Anonymous user" : (f.getCitizen() != null ? f.getCitizen().getName() : "");
            String citizenEmail = anon ? "" : (f.getCitizen() != null ? f.getCitizen().getEmail() : "");
            String officerEmail = f.getAssignedOfficer() != null ? f.getAssignedOfficer().getEmail() : null;
            return new FeedbackDtos.AdminItem(
                    f.getId(),
                    f.getTitle(),
                    f.getStatus().name(),
                    f.getType() != null ? f.getType().name() : null,
                    f.getSubmissionType() != null ? f.getSubmissionType().name() : "FEEDBACK",
                    fmt.format(f.getUpdatedAt()),
                    citizenName,
                    citizenEmail,
                    anon,
                    officerEmail,
                    f.getDeadline() != null ? f.getDeadline().toString() : null,
                    f.getEscalationLevel(),
                    f.getPhotoUrl(),
                    f.getAdminMessage(),
                    f.getRating(),
                    f.getRatingComment()
            );
        }).toList();
        return ResponseEntity.ok(out);
    }

    @PutMapping("/feedbacks/{id}/assign")
    public ResponseEntity<Void> assign(@AuthenticationPrincipal UserDetails principal,
                                       @PathVariable Long id,
                                       @RequestParam("officerId") Long officerId) {
        User admin = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        feedbackService.assignToOfficer(admin, id, officerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/feedbacks/counts")
    public ResponseEntity<com.smartgrievance.service.FeedbackService.Counts> counts() {
        return ResponseEntity.ok(feedbackService.adminCounts());
    }

    @PutMapping("/feedbacks/{id}/deadline")
    public ResponseEntity<Feedback> assignDeadline(@AuthenticationPrincipal UserDetails principal,
                                                    @PathVariable Long id,
                                                    @RequestBody FeedbackDtos.DeadlineRequest req) {
        User admin = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Feedback f = feedbackService.assignDeadline(admin, id, req.deadline());
        return ResponseEntity.ok(f);
    }

    @GetMapping("/feedbacks/statistics")
    public ResponseEntity<FeedbackDtos.StatisticsResponse> statistics() {
        return ResponseEntity.ok(feedbackService.getAdminStatistics());
    }

    @PutMapping("/feedbacks/{id}/message")
    public ResponseEntity<Feedback> sendAdminMessage(@AuthenticationPrincipal UserDetails principal,
                                                     @PathVariable Long id,
                                                     @RequestBody FeedbackDtos.AdminMessageRequest req) {
        User admin = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        Feedback f = feedbackService.sendAdminMessage(admin, id, req.message());
        return ResponseEntity.ok(f);
    }
}




