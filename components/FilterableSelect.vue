<template>
  <dropdown
    class="filterable-select"
    linkClass="form-select"
    :keepOpen="multiple"
    :gap="0"
    @opened="selectOpened"
    ref="dropdown"
  >
    <template slot="title" v-if="multiple">{{ label }}</template>
    <slot v-else slot="title" :option="selected">{{ label }}</slot>

    <div class="p-2">
      <input
        v-model="filter"
        class="form-control"
        :placeholder="placeholder"
        @mousedown.stop
        @click.stop
        @keydown.enter="enterPressed"
        ref="filterInput"
      />
    </div>
    <div class="overflow-auto dropdown-items">
      <template v-if="multiple">
        <a
          href="#"
          @click.stop="select(option)"
          v-for="option in filtered"
          class="dropdown-item d-flex align-items-center"
        >
          <input
            type="checkbox"
            class="form-check-input me-2"
            :checked="isSelected(option)"
          />
          <slot :option="option">{{ option }}</slot>
        </a>
      </template>
      <template v-else>
        <a
          href="#"
          @click="select(option)"
          v-for="option in filtered"
          class="dropdown-item"
          :class="value === option ? 'selected' : ''"
        >
          <slot :option="option">{{ option }}</slot>
        </a>
      </template>
    </div>
  </dropdown>
</template>

<script lang="ts">
  import { Component, Prop, Watch } from '@f-list/vue-ts';
  import Vue from 'vue';
  import Dropdown from '../components/Dropdown.vue';

  @Component({
    components: { dropdown: Dropdown }
  })
  export default class FilterableSelect extends Vue {
    @Prop
    readonly placeholder?: string;
    @Prop({ required: true })
    readonly options!: object[];
    @Prop({
      default: () => (filter: RegExp, value: string) => filter.test(value)
    })
    readonly filterFunc!: (filter: RegExp, value: object) => boolean;
    @Prop
    readonly multiple?: true = undefined;
    @Prop
    readonly value?: object | object[] = undefined;
    @Prop
    readonly title?: string;
    filter = '';
    selected: object | object[] | undefined =
      this.value !== undefined
        ? this.value
        : this.multiple !== undefined
          ? []
          : undefined;

    @Watch('value')
    watchValue(newValue: object | object[] | undefined): void {
      this.selected = newValue;
    }

    select(item: object): void {
      if (this.multiple !== undefined) {
        const selected = <object[]>this.selected;
        const index = selected.indexOf(item);
        if (index === -1) selected.push(item);
        else selected.splice(index, 1);
      } else this.selected = item;
      this.$emit('input', this.selected);
    }

    isSelected(option: object): boolean {
      return (<object[]>this.selected).indexOf(option) !== -1;
    }

    selectOpened() {
      this.$nextTick(() => {
        (this.$refs['filterInput'] as HTMLInputElement).focus();
      });
    }

    enterPressed() {
      if (this.filtered.length > 0) {
        this.select(this.filtered[0]);
        if (!this.multiple) {
          (this.$refs['dropdown'] as any).isOpen = false;
        }
      }
    }

    get filtered(): object[] {
      return this.options.filter(x => this.filterFunc(this.filterRegex, x));
    }

    get label(): string | undefined {
      return this.multiple !== undefined
        ? `${this.title} - ${(<object[]>this.selected).length}`
        : this.selected !== undefined
          ? this.selected.toString()
          : this.title;
    }

    get filterRegex(): RegExp {
      return new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');
    }
  }
</script>

<style lang="scss">
  .filterable-select {
    .dropdown-items {
      max-height: 200px;
      .dropdown-item.selected {
        background-color: var(--bs-dropdown-link-active-bg);
        color: var(--bs-dropdown-link-active-color);
      }
    }

    button {
      display: flex;
      text-align: start;
    }
  }
</style>
