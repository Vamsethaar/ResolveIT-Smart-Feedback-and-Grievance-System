package com.smartgrievance.dto;

import com.smartgrievance.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AdminDtos {
    public record CreateUserRequest(@NotBlank String name,
                                    @Email @NotBlank String email,
                                    @NotBlank String password,
                                    Role role) {}

    public record UpdateUserRequest(@NotBlank String name,
                                    @Email @NotBlank String email,
                                    Role role,
                                    String password) {}
}







