package com.digitalidentity.proofing.controller;

import com.digitalidentity.proofing.config.DemoSessionInterceptor;
import com.digitalidentity.proofing.dto.ExceptionResponse;
import com.digitalidentity.proofing.dto.ReviewRequest;
import com.digitalidentity.proofing.enums.QueueStatus;
import com.digitalidentity.proofing.service.ExceptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exceptions")
public class ExceptionController {

    private final ExceptionService exceptionService;

    public ExceptionController(ExceptionService exceptionService) {
        this.exceptionService = exceptionService;
    }

    @GetMapping
    public List<ExceptionResponse> listExceptions(@RequestParam(required = false) QueueStatus status) {
        return exceptionService.listExceptions(status);
    }

    @GetMapping("/{id}")
    public ExceptionResponse getException(@PathVariable Long id) {
        return exceptionService.getException(id);
    }

    @PostMapping("/{id}/review")
    public ExceptionResponse reviewException(@PathVariable Long id,
                                             @Valid @RequestBody ReviewRequest body,
                                             HttpServletRequest request) {
        String username = DemoSessionInterceptor.getSession(request).username();
        return exceptionService.reviewException(id, body, username);
    }
}
