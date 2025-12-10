package com.smartgrievance.controller;

import com.smartgrievance.dto.AuthDtos;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.UserRepository;
import com.smartgrievance.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ProfileController {
    private final AuthService authService;
    private final UserRepository userRepository;

    public ProfileController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.UserDto> me(@AuthenticationPrincipal UserDetails principal) {
        User u = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(new AuthDtos.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name()));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthDtos.UserDto> updateProfile(@AuthenticationPrincipal UserDetails principal, @Valid @RequestBody AuthDtos.UpdateProfileRequest req) {
        User u = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(authService.updateProfile(u, req));
    }
}










