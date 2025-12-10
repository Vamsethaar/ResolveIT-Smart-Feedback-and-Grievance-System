package com.smartgrievance.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterCitizenRequest(@NotBlank String name, @Email @NotBlank String email, @NotBlank String password) {}
    public record UpdateProfileRequest(@NotBlank String name, String password) {}
    public record AuthResponse(String token, UserDto user) {}
    public record UserDto(Long id, String name, String email, String role) {}
}


