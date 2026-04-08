package com.myfinance.support;

import org.springframework.security.test.context.support.WithSecurityContext;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation de test qui injecte un vrai {@code com.myfinance.domain.User}
 * dans le contexte Spring Security, compatible avec {@code @AuthenticationPrincipal}.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCustomUserFactory.class)
public @interface WithMockCustomUser {
    long id() default 1L;
    String login() default "jean.dupont";
    String role() default "USER";
}
