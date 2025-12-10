package com.smartgrievance.config;

import com.smartgrievance.model.Role;
import com.smartgrievance.model.User;
import com.smartgrievance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {
    @Bean
    public CommandLineRunner seedAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByEmail("admin@example.com").ifPresentOrElse(existing -> {
                existing.setRole(Role.ADMIN);
                existing.setPassword(passwordEncoder.encode("admin123"));
                userRepository.save(existing);
            }, () -> {
                User admin = new User();
                admin.setName("Admin User");
                admin.setEmail("admin@example.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(Role.ADMIN);
                userRepository.save(admin);
            });
        };
    }
}
