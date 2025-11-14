<template>
  <!--    <div class="character-images row">-->
  <div class="character-images">
    <div v-show="loading && images.length === 0" class="alert alert-info">
      {{ l('profile.images.loading') }}
    </div>
    <template v-if="!loading">
      <!-- @click="handleImageClick($event, image)" -->
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
    <div v-if="!loading && !images.length" class="alert alert-info">
      {{ l('profile.images.none') }}
    </div>
    <div class="image-preview" v-show="previewImage" @click="previewImage = ''">
      <img :src="previewImage" />
      <div class="modal-backdrop show"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import log from 'electron-log'; //tslint:disable-line:match-default-export-name
  import { ref } from 'vue';
  import { CharacterImage } from '../../interfaces';
  import * as Utils from '../utils';
  import { methods } from './data_store';
  import { Character } from './interfaces';
  import core from '../../chat/core';
  import _ from 'lodash';
  import l from '../../chat/localize';

  const props = defineProps<{
    character: Character;
    usePreview?: boolean;
    injectedImages?: CharacterImage[] | null;
  }>();

  const shown = ref(false);
  const previewImage = ref('');
  const images = ref<CharacterImage[]>([]);
  const loading = ref(true);
  const error = ref('');

  const imageUrl = (image: CharacterImage) => methods.imageUrl(image);
  const thumbUrl = (image: CharacterImage) => methods.imageThumbUrl(image);

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
    try {
      error.value = '';
      shown.value = true;
      loading.value = true;
      images.value = await resolveImagesAsync();
    } catch (err) {
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

  const handleImageClick = (e: MouseEvent, image: CharacterImage): void => {
    if (props.usePreview) {
      previewImage.value = methods.imageUrl(image);
      e.preventDefault();
    }
  };

  defineExpose({
    show
  });
</script>
