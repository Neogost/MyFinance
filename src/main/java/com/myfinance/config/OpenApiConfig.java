package com.myfinance.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityScheme.In;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class OpenApiConfig {

    @Bean
    OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MyFinance API")
                        .description("API de gestion d'investissements financiers personnels")
                        .version("0.0.1-SNAPSHOT"))
                // Déclare le cookie de session comme mécanisme d'auth dans Swagger UI
                .addSecurityItem(new SecurityRequirement().addList("cookieAuth"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .type(Type.APIKEY)
                                .in(In.COOKIE)
                                .name("JSESSIONID")
                                .description("Cookie de session Spring Security")));
    }
}
