<template>
  <modal
    :action="l('conversationSettings.action', conversation.name)"
    @submit="submit"
    ref="dialog"
    @open="load()"
    dialogClass="w-100"
    :buttonText="l('conversationSettings.save')"
    iconClass="fas fa-gear"
  >
    <div class="mb-3">
      <label class="control-label" :for="'notify' + conversation.key">{{
        l('conversationSettings.notify')
      }}</label>
      <select
        class="form-select"
        :id="'notify' + conversation.key"
        v-model="notify"
      >
        <option :value="setting.Default">
          {{ l('conversationSettings.default') }}
        </option>
        <option :value="setting.True">
          {{ l('conversationSettings.true') }}
        </option>
        <option :value="setting.False">
          {{ l('conversationSettings.false') }}
        </option>
      </select>
    </div>
    <div class="mb-3">
      <label class="control-label" :for="'highlight' + conversation.key">{{
        l('settings.highlight')
      }}</label>
      <select
        class="form-select"
        :id="'highlight' + conversation.key"
        v-model="highlight"
      >
        <option :value="setting.Default">
          {{ l('conversationSettings.default') }}
        </option>
        <option :value="setting.True">
          {{ l('conversationSettings.true') }}
        </option>
        <option :value="setting.False">
          {{ l('conversationSettings.false') }}
        </option>
      </select>
    </div>
    <div class="mb-3">
      <div class="form-check">
        <input
          class="form-check-input"
          type="checkbox"
          id="defaultHighlights"
          v-model="defaultHighlights"
        />
        <label class="form-check-label" for="defaultHighlights">
          {{ l('settings.defaultHighlights') }}
        </label>
      </div>
    </div>
    <div class="mb-3">
      <label class="control-label" :for="'highlightWords' + conversation.key">{{
        l('settings.highlightWords')
      }}</label>
      <input
        :id="'highlightWords' + conversation.key"
        class="form-control"
        v-model="highlightWords"
      />
    </div>
    <div class="mb-3">
      <label class="control-label" :for="'highlightUsers' + conversation.key">{{
        l('settings.highlightUsers.conversation')
      }}</label>
      <input
        :id="'highlightUsers' + conversation.key"
        class="form-control"
        v-model="horizonHighlightUsers"
      />
    </div>
    <div class="mb-3">
      <label class="control-label" :for="'joinMessages' + conversation.key">{{
        l('settings.joinMessages')
      }}</label>
      <select
        class="form-select"
        :id="'joinMessages' + conversation.key"
        v-model="joinMessages"
      >
        <option :value="setting.Default">
          {{ l('conversationSettings.default') }}
        </option>
        <option :value="setting.True">
          {{ l('conversationSettings.true') }}
        </option>
        <option :value="setting.False">
          {{ l('conversationSettings.false') }}
        </option>
      </select>
    </div>
    <div class="mb-3">
      <label class="control-label" :for="'logMessages' + conversation.key">{{
        l('conversationSettings.logMessages')
      }}</label>
      <select
        class="form-select"
        :id="'logMessages' + conversation.key"
        v-model="logMessages"
      >
        <option :value="setting.Default">
          {{ l('conversationSettings.default') }}
        </option>
        <option :value="setting.True">
          {{ l('conversationSettings.true') }}
        </option>
        <option :value="setting.False">
          {{ l('conversationSettings.false') }}
        </option>
      </select>
    </div>
  </modal>
</template>

<script lang="ts">
  import { Component, Prop } from '@f-list/vue-ts';
  import CustomDialog from '../components/custom_dialog';
  import Modal from '../components/Modal.vue';
  import { Conversation } from './interfaces';
  import l from './localize';

  @Component({
    components: { modal: Modal }
  })
  export default class ConversationSettings extends CustomDialog {
    @Prop({ required: true })
    readonly conversation!: Conversation;
    l = l;
    setting = Conversation.Setting;
    notify!: Conversation.Setting;
    highlight!: Conversation.Setting;
    highlightWords!: string;
    horizonHighlightUsers!: string;
    joinMessages!: Conversation.Setting;
    defaultHighlights!: boolean;
    logMessages!: Conversation.Setting;

    load(): void {
      const settings = this.conversation.settings;
      this.notify = settings.notify;
      this.highlight = settings.highlight;
      this.highlightWords = settings.highlightWords.join(',');
      this.joinMessages = settings.joinMessages;
      this.defaultHighlights = settings.defaultHighlights;
      this.horizonHighlightUsers = settings.horizonHighlightUsers.join(',');
      this.logMessages = settings.logMessages;
    }

    submit(): void {
      this.conversation.settings = {
        notify: this.notify,
        highlight: this.highlight,
        highlightWords: this.highlightWords
          .split(',')
          .map(x => x.trim())
          .filter(x => x.length > 0),
        horizonHighlightUsers: this.horizonHighlightUsers
          .split(',')
          .map(x => x.trim())
          .filter(x => x.length > 0),

        joinMessages: this.joinMessages,
        defaultHighlights: this.defaultHighlights,
        adSettings: this.conversation.settings.adSettings,
        logMessages: this.logMessages
      };
    }
  }
</script>
