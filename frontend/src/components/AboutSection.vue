<template>
  <section id="about" class="pixel-window fade-in-section">
    <button
      @click="showAbout = !showAbout"
      class="pixel-window__bar"
      type="button"
      aria-controls="about-content"
      :aria-expanded="showAbout"
    >
      <span class="pixel-window__title">About</span>
      <span class="pixel-window__chrome" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="pixel-window__toggle">{{ showAbout ? '−' : '+' }}</span>
    </button>
    <transition name="fade">
      <div v-if="showAbout" id="about-content" class="pixel-window__content about-content">
        <img src="/mj.jpg" alt="Michael Jaumann" class="pixel-avatar" />
        <h1 class="pixel-name">Michael Jaumann</h1>
        <p class="pixel-lede">
          Hi, I'm Michael Jaumann. I live in Munich and work for the
          <a
            href="https://ki.muenchen.de/ki-team"
            target="_blank"
            rel="noopener"
            class="pixel-link"
            >KIES</a
          >.
        </p>
        <div class="pixel-tags">
          <span class="pixel-chip pixel-chip--amber">Open Sourcerer</span>
          <span class="pixel-chip pixel-chip--orange">Spaghetti Lover</span>
          <span class="pixel-chip pixel-chip--red">Running Enthusiast</span>
        </div>
        <div class="pixel-card">
          <h2 class="pixel-section-title">Education</h2>
          <ul class="pixel-list">
            <li>
              <strong>B.Sc. Computer Science</strong>, Hochschule München (2012–2016)<br />
              Thesis: VANET Overlay Networks
            </li>
            <li>
              <strong>M.Sc. Computer Science</strong>, TU München (2017–2022, part-time)<br />
              Focus: Machine Learning & Software Engineering<br />
              Thesis: Protein Language Models for Structure Prediction
            </li>
          </ul>
        </div>
        <div class="pixel-card">
          <h2 class="pixel-section-title">Skills</h2>
          <ul class="pixel-list">
            <li>
              <strong>Machine Learning:</strong> Pytorch, Huggingface Transformers, Scikit-learn
            </li>
            <li><strong>GenAI Frameworks:</strong> Langchain, Langgraph</li>
            <li><strong>Frontend:</strong> React, Vue.js</li>
            <li><strong>Backend:</strong> FastAPI, Spring</li>
            <li>
              <strong>DevOps:</strong> Gitlab Pipelines, Github Pipelines, Terraform, Openshift,
              Helm, Kubernetes
            </li>
            <li><strong>Programming Languages:</strong> Python, Java, Typescript, C++</li>
            <li><strong>Others:</strong> OpenCV, OpenGL, OMNeT++</li>
          </ul>
        </div>
        <div class="pixel-card">
          <h2 class="pixel-section-title">Hobbies</h2>
          <div class="pixel-tags">
            <span class="pixel-chip pixel-chip--amber">Running</span>
            <span class="pixel-chip pixel-chip--orange">Cycling</span>
            <span class="pixel-chip pixel-chip--red">Dog walks</span>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showAbout = ref(true)
</script>