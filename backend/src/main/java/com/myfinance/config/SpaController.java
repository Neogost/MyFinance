package com.myfinance.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Renvoie index.html pour toutes les routes SPA React (sans extension de fichier).
 * Les fichiers statiques (/assets/*.js, *.css…) sont servis directement
 * par le ResourceHttpRequestHandler de Spring Boot avant d'atteindre ce controller.
 */
@Controller
public class SpaController {

    @GetMapping(value = { "/", "/{path:[^\\.]*}" })
    public String index() {
        return "forward:/index.html";
    }
}
