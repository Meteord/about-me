<template>
  <section id="projects" class="pixel-window fade-in-section">
    <button
      @click="showProjects = !showProjects"
      class="pixel-window__bar"
      type="button"
      aria-controls="projects-content"
      :aria-expanded="showProjects"
    >
      <span class="pixel-window__title">Projects</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ showProjects ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showProjects" id="projects-content" class="pixel-window__content">
        <div class="project-grid">
          <div class="project-grid__main project-card">
            <div>
              <h3 class="project-card__title">MUCGPT</h3>
              <p class="project-card__desc">
                MUCGPT is Munich's open-source AI chatbot for citizens, enabling secure and
                customizable interactions with large language models. Users can create and share
                their own assistants, with roles and rights managed via Single Sign-On. The
                platform is designed for extensibility, privacy, and ease of use in public sector
                applications.
              </p>
            </div>
            <a
              href="https://github.com/it-at-m/mucgpt"
              target="_blank"
              rel="noopener"
              class="pixel-link-btn project-card__link"
            >
              View on GitHub
            </a>
          </div>
          <div class="project-grid__side">
            <p class="tech-stack__label">Technology Stack:</p>
            <div class="tech-grid">
              <div class="tech-card">
                <p class="tech-card__title">Frontend</p>
                <ul>
                  <li>React</li>
                  <li>Typescript</li>
                  <li>Javascript</li>
                </ul>
              </div>
              <div class="tech-card tech-card--backend">
                <p class="tech-card__title">Backend</p>
                <ul>
                  <li>FastAPI</li>
                  <li>LangGraph</li>
                  <li>Python</li>
                </ul>
              </div>
              <div class="tech-card tech-card--deploy">
                <p class="tech-card__title">Deployment</p>
                <ul>
                  <li>Docker</li>
                  <li>API Gateway</li>
                  <li>PostgresDB</li>
                  <li>Keycloak</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showProjects = ref(false)
</script>