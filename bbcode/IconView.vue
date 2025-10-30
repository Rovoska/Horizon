<template>
  <a
    :href="`${Utils.siteDomain}c/${character.name}`"
    target="_blank"
    v-bind:character.prop="character"
    @mouseover.prevent="show()"
    @mouseenter.prevent="show()"
    @mouseleave.prevent="dismiss()"
    @click.middle.prevent.stop="toggleStickyness()"
    @click.right.passive="dismiss(true)"
    @click.left.passive="dismiss(true)"
    ><img
      :src="characterImage(character.name, useOriginalAvatar)"
      class="character-avatar icon"
      id="img"
      :title="character.name"
      :alt="character.name"
      @error="onImageError"
  /></a>
</template>

<script lang="ts">
  import { Component, Hook, Prop } from '@f-list/vue-ts';
  import Vue from 'vue';
  import { EventBus } from '../chat/preview/event-bus';
  import * as Utils from '../site/utils';
  import { characterImage } from '../chat/common';
  import { Character } from '../fchat';

  @Component
  export default class IconView extends Vue {
    Utils = Utils;
    characterImage = characterImage;
    imageError = false;

    @Prop({ required: true })
    readonly character!: Character;

    @Prop()
    readonly useOriginalAvatar: boolean = false;

    @Hook('mounted')
    mounted(): void {
      // do nothing
    }

    @Hook('beforeDestroy')
    beforeDestroy(): void {
      this.dismiss();
    }

    @Hook('deactivated')
    deactivate(): void {
      this.dismiss();
    }

    getCharacterUrl(): string {
      return `flist-character://${this.character.name}`;
    }

    dismiss(force: boolean = false): void {
      // if (!this.preview) {
      //   return;
      // }

      EventBus.$emit('imagepreview-dismiss', {
        url: this.getCharacterUrl(),
        force
      });
    }

    show(): void {
      // if (!this.preview) {
      //   return;
      // }

      EventBus.$emit('imagepreview-show', { url: this.getCharacterUrl() });
    }

    toggleStickyness(): void {
      // if (!this.preview) {
      //   return;
      // }

      EventBus.$emit('imagepreview-toggle-stickyness', {
        url: this.getCharacterUrl()
      });
    }

    onImageError(): void {
      this.imageError = true;
      this.character.overrides.avatarUrl = undefined;
    }
  }
</script>
