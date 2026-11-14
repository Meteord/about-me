<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'about-details' })
</script>

<template>
  <section
    ref="root"
    id="background"
    class="pixel-window about-details reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'about' }"
    aria-labelledby="about-details-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <AnchorHeading
        id="about-details-title"
        tag="h2"
        class="pixel-window__title"
        href="background"
        label="Background"
      >
        Background
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/background</span>
    </div>
    <div class="pixel-window__content about-content">
      <div
        id="education"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'education' }"
      >
        <AnchorHeading class="pixel-section-title" href="education" label="Education">
          Education
        </AnchorHeading>
        <ul class="pixel-list">
          <li v-for="entry in siteData.education" :key="entry.degree" class="pixel-edu">
            <span class="pixel-edu__head">
              <strong>{{ entry.degree }}</strong>
              <span class="pixel-edu__meta">{{ entry.school }} · {{ entry.period }}</span>
            </span>
            <span class="pixel-edu__detail">{{ entry.detail }}</span>
          </li>
        </ul>
      </div>
      <div
        id="skills"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'skills' }"
      >
        <AnchorHeading class="pixel-section-title" href="skills" label="Skills">
          Skills
        </AnchorHeading>
        <ul class="pixel-skills">
          <li v-for="group in siteData.skills" :key="group.label" class="pixel-skill">
            <span class="pixel-skill__label">{{ group.label }}</span>
            <span class="pixel-skill__items">
              <span v-for="item in group.items" :key="item" class="pixel-chip pixel-chip--sm">{{
                item
              }}</span>
            </span>
          </li>
        </ul>
      </div>
      <div
        id="hobbies"
        class="pixel-card"
        :class="{ 'pixel-spotlight': state.spotlight === 'hobbies' }"
      >
        <AnchorHeading class="pixel-section-title" href="hobbies" label="Hobbies">
          Hobbies
        </AnchorHeading>
        <div
          id="nubi"
          class="hobby-track"
          :class="{ 'pixel-spotlight': state.spotlight === 'nubi' }"
        >
          <div class="hobby-track__head">
            <AnchorHeading
              class="hobby-track__title"
              tag="h4"
              href="nubi"
              :label="siteData.dog.name"
            >
              {{ siteData.dog.name }}
            </AnchorHeading>
            <p class="hobby-track__note">{{ siteData.dog.caption }}</p>
          </div>
          <div class="hobby-dog">
            <figure class="hobby-dog__portrait">
              <span class="hobby-dog__screen">
                <img
                  src="/nubi.webp"
                  alt="Nubi, a white Lagotto Romagnolo, curled up in his patterned dog bed next to a red toy ball"
                  width="560"
                  height="598"
                  class="hobby-dog__photo"
                  loading="lazy"
                />
              </span>
            </figure>
            <div class="hobby-dog__body">
              <p class="hobby-dog__blurb">{{ siteData.dog.blurb }}</p>
              <dl class="hobby-dog__facts">
                <div class="hobby-dog__fact">
                  <dt>Breed</dt>
                  <dd>{{ siteData.dog.breed }}</dd>
                </div>
                <div class="hobby-dog__fact">
                  <dt>Born</dt>
                  <dd>{{ siteData.dog.birth }}</dd>
                </div>
                <div class="hobby-dog__fact">
                  <dt>Weight</dt>
                  <dd>{{ siteData.dog.weight }}</dd>
                </div>
                <div class="hobby-dog__fact">
                  <dt>Top speed</dt>
                  <dd>{{ siteData.dog.topSpeed }}</dd>
                </div>
                <div class="hobby-dog__fact hobby-dog__fact--wide">
                  <dt>Likes</dt>
                  <dd>{{ siteData.dog.likes.join(', ') }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <div
          id="cycling-adventures"
          class="hobby-track"
          :class="{ 'pixel-spotlight': state.spotlight === 'cycling-adventures' }"
        >
          <div class="hobby-track__head">
            <AnchorHeading
              class="hobby-track__title"
              tag="h4"
              href="cycling-adventures"
              label="Cycling adventures"
            >
              Cycling adventures
            </AnchorHeading>
          </div>
          <figure class="hobby-rides__figure">
            <span class="hobby-rides__screen">
              <img
                src="/fahrrad.webp"
                alt="A cyclist climbing a high alpine pass road, a Jeep ahead, with a green mountain ridge and an old stone tower under a blue sky"
                width="1200"
                height="1600"
                class="hobby-rides__photo"
                loading="lazy"
              />
            </span>
            <figcaption class="hobby-rides__caption">I enjoy going far, not fast</figcaption>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>
