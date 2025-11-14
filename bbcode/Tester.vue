<template>
  <div>
    <textarea v-model="code"> </textarea>

    <bbcode :text="code"></bbcode>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';

  import { BBCodeView } from './view';
  import { StandardBBCodeParser } from './standard';

  const standardParser = new StandardBBCodeParser();

  const bbcode = BBCodeView(standardParser);

  const code = ref(
    '[center][heading][collapse=Testing Collapse][url=https://google.com/]This is a link [/url][/collapse][/heading][/center]'
  );
</script>

<style lang="scss"></style>
