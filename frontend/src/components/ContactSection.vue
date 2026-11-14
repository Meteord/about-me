<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'contact' })
</script>

<template>
  <section
    ref="root"
    id="contact"
    class="pixel-window reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'contact' }"
    aria-labelledby="contact-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <AnchorHeading
        id="contact-title"
        tag="h2"
        class="pixel-window__title"
        href="contact"
        label="Contact"
      >
        Contact
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/contact</span>
    </div>
    <div class="pixel-window__content contact-panel">
      <div class="contact-panel__intro">
        <p class="contact-panel__prompt">Say hello.</p>
        <p class="contact-panel__meta">
          <span class="about-intro__led" aria-hidden="true"></span>
          {{ siteData.location }}, Germany
        </p>
      </div>
      <div class="pixel-contact">
        <a
          :href="siteData.contact.linkedin"
          target="_blank"
          rel="noopener"
          class="pixel-contact__link pixel-contact__link--linkedin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
          </svg>
          LinkedIn
        </a>
        <a
          :href="siteData.contact.github"
          target="_blank"
          rel="noopener"
          class="pixel-contact__link pixel-contact__link--github"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.527.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.649.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.218.694.825.576 4.765-1.585 8.199-6.082 8.199-11.385 0-6.627-5.373-12-12-12z"
            />
          </svg>
          GitHub
        </a>
      </div>
    </div>
  </section>
</template>
