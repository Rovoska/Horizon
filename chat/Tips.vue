<template>
  <div class="alert alert-info align-items-center d-flex" v-if="show">
    <div class="flex-grow-1">
      <b> {{ l('tips') + ': ' }}</b>
      <span>
        {{ tip() }}
      </span>
    </div>
    <div class="btn-group flex-shrink-0">
      <button type="button" class="btn btn-link" @click="handlePrevious()">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <button type="button" class="btn btn-link" @click="handleNext()">
        <i class="fa-solid fa-arrow-right"></i>
      </button>
      <button type="button" class="btn btn-link" @click="show = !show">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </div>
</template>

<script>
  import { defineComponent, ref, watch, nextTick } from 'vue';
  import tip, { previousTip, nextTip } from './tips';
  import l from './localize';
  export default defineComponent({
    setup(props) {
      const show = ref(true);

      function handleNext() {
        console.log(nextTip());
      }

      function handlePrevious() {
        console.log(previousTip());
      }
      return {
        show,
        handleNext,
        handlePrevious,
        l,
        tip
      };
    }
  });
</script>
