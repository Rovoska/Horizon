<template>
  <div
    v-if="show"
    ref="tipContainer"
    class="tip-container bg-body-tertiary"
    :style="containerHeight && { height: containerHeight + 'px' }"
  >
    <div ref="tipContent" class="tip-content">
      <div class="tip-label text-info-emphasis">{{ l('tips') }}</div>
      <div class="tip-text"><bbcode :text="tip" /></div>
    </div>
    <div class="tip-controls">
      <div class="tip-nav">
        <button type="button" class="tip-btn" @click="handlePrevious()">
          <i class="fa-solid fa-chevron-up" />
        </button>
        <button type="button" class="tip-btn" @click="handleNext()">
          <i class="fa-solid fa-chevron-down" />
        </button>
      </div>
      <button
        type="button"
        class="tip-btn tip-btn--dismiss"
        @click="show = !show"
      >
        <i class="fa-solid fa-xmark" />
      </button>
    </div>
  </div>
</template>

<script>
  import {
    defineComponent,
    ref,
    watch,
    nextTick,
    computed,
    onMounted,
    onBeforeUnmount
  } from 'vue';
  import tip, { previousTip, nextTip } from './tips';
  import l from './localize';
  import { BBCodeView } from '../bbcode/view';
  import { UserInterfaceBBCodeParser } from '../bbcode/user-interface';

  export default defineComponent({
    components: { bbcode: BBCodeView(new UserInterfaceBBCodeParser()) },
    setup() {
      const show = ref(true);
      const tipContainer = ref(null);
      const tipContent = ref(null);
      const containerHeight = ref(null);
      const currentTip = computed(() => tip());
      let observer = null;

      const calculateHeight = () => {
        if (!tipContent.value) return;
        const { scrollHeight } = tipContent.value;
        const { paddingTop, paddingBottom } = window.getComputedStyle(
          tipContainer.value
        );
        containerHeight.value = Math.max(
          Math.ceil(scrollHeight) +
            parseFloat(paddingTop) +
            parseFloat(paddingBottom),
          44
        );
      };

      onMounted(() =>
        nextTick(() => {
          calculateHeight();
          observer = new ResizeObserver(calculateHeight);
          observer.observe(tipContent.value);
        })
      );

      onBeforeUnmount(() => observer?.disconnect());

      watch(currentTip, () => nextTick(calculateHeight));
      watch(show, val => val && nextTick(calculateHeight));

      return {
        show,
        handleNext: nextTip,
        handlePrevious: previousTip,
        l,
        tip: currentTip,
        tipContainer,
        tipContent,
        containerHeight
      };
    }
  });
</script>

<!---
NOTE: dear god help me why is this so long?
-->
<style scoped lang="scss">
  .tip-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--chat-tip-border, var(--bs-border-color));
    border-radius: var(--bs-border-radius);
    color: var(--chat-tip-color, var(--bs-body-color));
    font-size: 13px;
    line-height: 1.4;
    overflow: hidden;
    transition: height 0.2s ease;
  }

  .tip-content {
    flex: 1;
    min-width: 0;
  }

  .tip-label {
    font-weight: 600;
  }

  .tip-text {
    color: var(
      --chat-tip-secondary,
      var(--bs-secondary-color, var(--bs-body-color))
    );
  }

  .tip-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tip-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tip-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 18px;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(
      --chat-tip-button-color,
      var(--bs-secondary-color, var(--bs-body-color))
    );
    transition:
      background-color 0.15s,
      color 0.15s;

    &:hover,
    &:focus-visible {
      background: color-mix(
        in srgb,
        var(--bs-secondary-bg, var(--bs-tertiary-bg)) 70%,
        transparent
      );
      color: var(--chat-tip-button-hover-color, var(--bs-body-color));
    }

    &:focus-visible {
      outline: 2px solid var(--bs-primary);
      outline-offset: -2px;
    }

    &--dismiss {
      height: 38px;
    }
  }
</style>
