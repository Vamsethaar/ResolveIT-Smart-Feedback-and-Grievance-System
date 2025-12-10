package com.smartgrievance.service;

import com.smartgrievance.dto.AuthDtos;
import com.smartgrievance.model.Role;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.UserRepository;
import com.smartgrievance.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    public AuthDtos.AuthResponse registerCitizen(AuthDtos.RegisterCitizenRequest req) {
        if (userRepository.existsByEmail(req.email())) throw new IllegalArgumentException("Email already in use");
        User u = new User();
        u.setName(req.name());
        u.setEmail(req.email());
        u.setPassword(passwordEncoder.encode(req.password()));
        u.setRole(Role.CITIZEN);
        userRepository.save(u);
        String token = jwtUtil.generateToken(u.getEmail(), Map.of("role", u.getRole().name(), "uid", u.getId()));
        return new AuthDtos.AuthResponse(token, new AuthDtos.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name()));
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        User u = userRepository.findByEmail(req.email()).orElseThrow();
        String token = jwtUtil.generateToken(u.getEmail(), Map.of("role", u.getRole().name(), "uid", u.getId()));
        return new AuthDtos.AuthResponse(token, new AuthDtos.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name()));
    }

    public AuthDtos.UserDto updateProfile(User user, AuthDtos.UpdateProfileRequest req) {
        user.setName(req.name());
        if (req.password() != null && !req.password().isEmpty()) {
            user.setPassword(passwordEncoder.encode(req.password()));
        }
        User updated = userRepository.save(user);
        return new AuthDtos.UserDto(updated.getId(), updated.getName(), updated.getEmail(), updated.getRole().name());
    }
}


