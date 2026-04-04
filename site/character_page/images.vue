<template>
  <!--    <div class="character-images row">-->
  <div
    class="character-images"
    :class="
      previewType === 'thumbnail' || previewType === 'hover' ? 'thumbnails' : ''
    "
  >
    <div v-show="loading && images.length === 0" class="w-100 alert alert-info">
      {{ l('profile.images.loading') }}
    </div>
    <template v-if="!loading">
      <template v-if="previewType === 'thumbnail' || previewType === 'hover'">
        <div
          v-for="image in images"
          :key="image.id"
          class="character-image-thumb-wrapper"
        >
          <template v-if="previewType === 'thumbnail'">
            <a
              @click="handleImageClick($event, image)"
              target="_blank"
              :href="imageUrl(image)"
              :title="image.description"
            >
              <img :src="thumbUrl(image)" class="img-thumbnail" />
            </a>
          </template>
          <template v-else>
            <a
              :href="imageUrl(image)"
              target="_blank"
              :title="image.description"
              @mouseover.prevent="showHoverPreview(image)"
              @mouseenter.prevent="showHoverPreview(image)"
              @mouseleave.prevent="hideHoverPreview(image)"
              @click.middle.prevent.stop="toggleStickyness()"
            >
              <img :src="thumbUrl(image)" class="img-thumbnail" />
            </a>
          </template>
        </div>
      </template>

      <template v-else>
        <div
          v-for="image in images"
          :key="image.id"
          class="character-image-wrapper"
        >
          <a :href="imageUrl(image)" target="_blank">
            <img :src="imageUrl(image)" class="character-image" />
          </a>
          <div class="image-description" v-if="!!image.description">
            {{ image.description }}
          </div>
        </div>
      </template>
    </template>
    <div v-if="!loading && !images.length" class="alert alert-info">
      {{ l('profile.images.none') }}
    </div>
    <div
      class="image-preview"
      v-if="previewImage !== undefined"
      @click="handlePreviewClick($event)"
    >
      <div class="image-preview-scroll-area">
        <a
          :href="imageUrl(previewImage)"
          target="_blank"
          class="image-preview-link"
          :style="{ '--zoom-level': zoomLevel }"
        >
          <img :src="imageUrl(previewImage)" />
        </a>
      </div>
      <div
        class="image-preview-buttons-container d-flex flex-grow-1"
        v-if="images.length > 1"
      >
        <div class="preview-buttons-left preview-buttons">
          <button
            type="button"
            @click.stop="previewPrev()"
            class="btn btn-outline-secondary"
          >
            <i class="fa-solid fa-arrow-left"></i>
          </button>
        </div>
        <div class="preview-buttons-spacer flex-grow-1"></div>
        <div class="preview-buttons-right preview-buttons">
          <button
            type="button"
            @click.stop="previewNext()"
            class="btn btn-outline-secondary"
          >
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
      <div class="image-preview-info-outer d-flex align-items-end">
        <div
          class="image-preview-info d-flex flex-grow-1"
          @click.stop
          :class="forceShowInfo ? 'force-show-info' : ''"
        >
          <p class="info-description">
            <span v-if="previewImage.description">
              {{ previewImage.description }}
            </span>
            <i v-else> {{ l('profile.noDescription') }} </i>
          </p>

          <div class="d-flex info-buttons flex-wrap">
            <div class="input-group mb-2 buttons-numbers">
              <span
                class="image-preview-numbers input-group-text"
                v-if="images.length > 1"
              >
                {{ `${images.indexOf(previewImage) + 1}/${images.length}` }}
              </span>
              <a
                :href="imageUrl(previewImage)"
                class="btn btn-lg btn-outline-secondary"
              >
                <i class="fa-solid fa-fw fa-arrow-up-right-from-square"></i>
              </a>
              <button
                type="button"
                class="btn btn-lg"
                :class="copySuccess ? 'btn-success' : 'btn-outline-primary'"
                @click.stop="copyImageLink(previewImage)"
              >
                <i
                  class="fa-fw"
                  :class="
                    copySuccess ? 'fa-check fa-solid' : 'fa-regular fa-copy'
                  "
                ></i>
              </button>
            </div>
            <div class="input-group mb-3 w-100">
              <button
                class="btn btn-outline-secondary zoom-btn out"
                type="button"
                @click="zoomOutClicked"
              >
                <i class="fa-solid fa-magnifying-glass-minus"></i>
              </button>
              <input
                type="number"
                class="form-control zoom-number"
                placeholder=""
                v-model="zoomLevel"
                :min="getZoomMin()"
                :max="getZoomMax()"
              />
              <label class="input-group-text zoom-range-container">
                <input
                  type="range"
                  class="form-range zoom-range"
                  :min="getZoomMin()"
                  :max="getZoomMax()"
                  v-model="zoomLevel"
              /></label>

              <button
                class="btn btn-outline-secondary zoom-btn"
                type="button"
                @click="zoomInClicked"
              >
                <i class="fa-solid fa-magnifying-glass-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import log from 'electron-log'; //tslint:disable-line:match-default-export-name
  import { ref, watch } from 'vue';
  import { CharacterImage } from '../../interfaces';
  import * as Utils from '../utils';
  import { methods } from './data_store';
  import { Character } from './interfaces';
  import core from '../../chat/core';
  import _, { template } from 'lodash';
  import l from '../../chat/localize';
  import { Keys } from '../../keys';
  import { getKey } from '../../chat/common';
  import { ProfileViewerGalleryType } from '../utils';
  import { EventBus } from '../../chat/preview/event-bus';

  const props = defineProps<{
    character: Character;
    previewType: ProfileViewerGalleryType;
    animatedThumbs?: boolean;
    injectedImages?: CharacterImage[] | null;
  }>();

  const FORCE_SHOW_INFO_TIMEOUT = 2500;
  const COPY_SUCCESS_TIMEOUT = 3500;
  const ZOOM_LEVEL_MIN = 100;
  const ZOOM_LEVEL_MAX = 200;
  const ZOOM_LEVEL_STEP = 25;

  const shown = ref(false);
  const previewImage = ref<CharacterImage>();
  const zoomLevel = ref(ZOOM_LEVEL_MIN);
  const forceShowInfo = ref(false);
  const copySuccess = ref(false);
  const images = ref<CharacterImage[]>([]);
  const loading = ref(true);
  const error = ref('');

  watch(
    () => props.character,
    () => {
      shown.value = false;
      images.value = [];
      loading.value = true;
    }
  );

  const imageUrl = (image: CharacterImage) => methods.imageUrl(image);
  const thumbUrl = (image: CharacterImage) => {
    return props.animatedThumbs && image.extension === 'gif'
      ? methods.imageUrl(image)
      : methods.imageThumbUrl(image);
  };

  const resolveImages = (): CharacterImage[] => {
    log.debug('profile.images.sync.injected', {
      count: props.injectedImages ? props.injectedImages.length : 0
    });

    if (props.injectedImages && props.injectedImages.length) {
      return props.injectedImages;
    }

    const c = core.cache.profileCache.getSync(props.character.character.name);

    log.debug('profile.images.sync.cache', {
      count: _.get(c, 'meta.images.length')
    });

    if (c && c.meta && c.meta.images) {
      return c.meta.images;
    }

    return [];
  };

  const resolveImagesAsync = async (): Promise<CharacterImage[]> => {
    log.debug('profile.images.async.injected', {
      count: props.injectedImages ? props.injectedImages.length : 0
    });

    if (props.injectedImages && props.injectedImages.length) {
      return props.injectedImages;
    }

    const c = await core.cache.profileCache.get(props.character.character.name);

    log.debug('profile.images.async.cache', {
      count: _.get(c, 'meta.images.length')
    });

    if (c && c.meta && c.meta.images) {
      return c.meta.images;
    }

    const fetchedImages = await methods.imagesGet(props.character.character.id);

    log.debug('profile.images.async.api', { count: fetchedImages.length });

    return fetchedImages;
  };

  const showAsync = async (): Promise<void> => {
    log.debug('profile.images.show.async', {
      shown: shown.value,
      loading: loading.value
    });

    if (shown.value) return;
    const expectedName = props.character.character.name;
    try {
      error.value = '';
      shown.value = true;
      loading.value = true;
      const result = await resolveImagesAsync();
      if (props.character.character.name !== expectedName) {
        shown.value = false;
        return;
      }
      images.value = result;
    } catch (err) {
      if (props.character.character.name !== expectedName) return;
      shown.value = false;
      if (Utils.isJSONError(err)) error.value = <string>err.response.data.error;
      Utils.ajaxError(err, l('profile.images.unableRefresh'));
      log.error('profile.images.show.async.error', { err });
    }
    loading.value = false;
  };

  const show = (): void => {
    log.debug('profile.images.show', {
      shown: shown.value,
      loading: loading.value
    });

    if (shown.value) {
      return;
    }

    images.value = resolveImages();

    // this promise is intentionally not part of a chain
    showAsync().catch(err => log.error('profile.images.error', { err }));
  };

  const showPreview = (image: CharacterImage): void => {
    previewImage.value = image;
    window.addEventListener('keydown', handleKeydown);
    browseTimeOut();
  };

  const hidePreview = (): void => {
    previewImage.value = undefined;
    window.removeEventListener('keydown', handleKeydown);
    zoomLevel.value = ZOOM_LEVEL_MIN;
  };

  const handleImageClick = (e: MouseEvent, image: CharacterImage): void => {
    if (props.previewType === 'thumbnail') {
      showPreview(image);
      e.preventDefault();
    }
  };

  const zoomOutClicked = (_e: MouseEvent): void => {
    if (zoomLevel.value <= ZOOM_LEVEL_MIN) return;
    zoomLevel.value = Math.max(
      ZOOM_LEVEL_MIN,
      zoomLevel.value - ZOOM_LEVEL_STEP
    );
  };

  const zoomInClicked = (_e: MouseEvent): void => {
    if (zoomLevel.value >= ZOOM_LEVEL_MAX) return;
    zoomLevel.value = Math.min(
      ZOOM_LEVEL_MAX,
      zoomLevel.value + ZOOM_LEVEL_STEP
    );
  };
  const handlePreviewClick = (e: MouseEvent): void => {
    hidePreview();
    e.preventDefault();
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    const key = getKey(e);
    if (!previewImage.value) return;
    // 2026-04-03: Escape key handling has not been enabled because it conflicts with the global Escape key handling for modals.
    // This will be enabled once that system has been overhauled to use native HTML modals instead of a custom implementation.
    /*
    if (key === Keys.Escape) {
      e.stopPropagation();
      e.preventDefault();

      hidePreview();
    } else */ if (key === Keys.ArrowLeft) {
      previewPrev();
      e.preventDefault();
    } else if (key === Keys.ArrowRight) {
      previewNext();
      e.preventDefault();
    }
  };

  const previewPrev = async (): Promise<void> => {
    if (!previewImage) return;
    let targetIndex = images.value.indexOf(
      previewImage.value as CharacterImage
    );
    if (targetIndex <= 0) targetIndex = images.value.length;
    targetIndex--;
    previewImage.value = images.value[targetIndex];
    zoomLevel.value = ZOOM_LEVEL_MIN;
    browseTimeOut();
  };

  const previewNext = async (): Promise<void> => {
    if (!previewImage) return;
    let targetIndex = images.value.indexOf(
      previewImage.value as CharacterImage
    );
    targetIndex++;
    if (targetIndex >= images.value.length) targetIndex = 0;
    previewImage.value = images.value[targetIndex];
    zoomLevel.value = ZOOM_LEVEL_MIN;
    browseTimeOut();
  };

  const browseTimeOut = (): void => {
    if (!forceShowInfo.value) {
      log.silly('profile.images.forceShowInfo.timer.start');
      window.setTimeout(() => {
        forceShowInfo.value = false;
      }, FORCE_SHOW_INFO_TIMEOUT);
    }
    forceShowInfo.value = true;
  };

  const showHoverPreview = (image: CharacterImage): void => {
    EventBus.$emit('imagepreview-show', { url: imageUrl(image) });
  };

  const hideHoverPreview = (image: CharacterImage): void => {
    EventBus.$emit('imagepreview-dismiss', {
      url: imageUrl(image),
      force: false
    });
  };

  const toggleStickyness = (): void => {
    //nothing yet
  };

  const getZoomMin = (): number => {
    return ZOOM_LEVEL_MIN;
  };
  const getZoomMax = (): number => {
    return ZOOM_LEVEL_MAX;
  };

  const copyImageLink = (image: CharacterImage): void => {
    navigator.clipboard.writeText(imageUrl(image));
    copySuccess.value = true;
    window.setTimeout(() => {
      copySuccess.value = false;
    }, COPY_SUCCESS_TIMEOUT);
  };

  defineExpose({
    show
  });
</script>
