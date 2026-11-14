<script setup lang="ts">
import { ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSiteLayout } from '../composables/useSiteLayout'
import { siteData } from '../data/siteData'
import AnchorHeading from './AnchorHeading.vue'

const { state } = useSiteLayout()

const root = ref<HTMLElement | null>(null)
useReveal(root, { key: 'hobbies' })
</script>

<template>
  <section
    ref="root"
    id="hobbies"
    class="pixel-window reveal"
    :class="{ 'pixel-window--highlight': state.highlight === 'hobbies' }"
    aria-labelledby="hobbies-title"
  >
    <div class="pixel-window__bar pixel-window__bar--static">
      <AnchorHeading
        id="hobbies-title"
        tag="h2"
        class="pixel-window__title"
        href="hobbies"
        label="Hobbies"
      >
        Hobbies
      </AnchorHeading>
      <span class="pixel-window__crumb" aria-hidden="true">~/hobbies</span>
    </div>
    <div class="pixel-window__content hobbies-content">
      <div id="nubi" class="hobby-track" :class="{ 'pixel-spotlight': state.spotlight === 'nubi' }">
        <div class="hobby-track__head">
          <AnchorHeading class="hobby-track__title" tag="h4" href="nubi" :label="siteData.dog.name">
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
        id="running"
        class="hobby-track"
        :class="{ 'pixel-spotlight': state.spotlight === 'running' }"
      >
        <div class="hobby-track__head">
          <AnchorHeading class="hobby-track__title" tag="h4" href="running" label="Running">
            Running
          </AnchorHeading>
          <p class="hobby-track__note">{{ siteData.running.caption }}</p>
        </div>
        <div class="hobby-dog hobby-run">
          <figure class="hobby-dog__portrait">
            <span class="hobby-dog__screen">
              <img
                src="/laufen.webp"
                alt="A pair of yellow race shoes splattered with blue, orange and white paint, laces tied"
                width="2048"
                height="1152"
                class="hobby-dog__photo hobby-run__photo"
                loading="lazy"
              />
            </span>
          </figure>
          <div class="hobby-dog__body">
            <dl class="hobby-dog__facts hobby-run__facts">
              <div v-for="pb in siteData.running.pbs" :key="pb.distance" class="hobby-run__pb">
                <dt>{{ pb.distance }}</dt>
                <dd>{{ pb.time }}</dd>
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
  </section>
</template>
