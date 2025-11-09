import { defineComponent, ref, computed, watch, PropType } from 'vue';
import { CreateElement, VNode } from 'vue';

interface TabsProps {
  value?: string;
  tabs?: { readonly [key: string]: string } | string[];
  fullWidth?: boolean;
  tabClass?: string;
}

const Tabs = defineComponent({
  name: 'Tabs',
  props: {
    value: {
      type: String as PropType<string | undefined>,
      default: undefined
    },
    tabs: {
      type: [Object, Array] as PropType<
        { readonly [key: string]: string } | string[]
      >,
      default: () => ({})
    },
    fullWidth: {
      type: Boolean,
      default: false
    },
    tabClass: {
      type: String,
      default: 'nav-tabs'
    }
  },
  emits: ['input'],
  setup(props: TabsProps, { emit, slots }) {
    const internalValue = ref<string | undefined>(props.value);
    const selected = ref<string | undefined>(props.value);

    const children = computed(() => {
      let result: { [key: string]: string | VNode | undefined };

      if (slots.default !== undefined) {
        result = {};
        const defaultSlots = slots.default();
        if (defaultSlots) {
          defaultSlots.forEach((child, i) => {
            if (child.context !== undefined) {
              const key =
                child.key !== undefined && typeof child.key === 'string'
                  ? child.key
                  : String(i);
              result[key] = child;
            }
          });
        }
      } else {
        const tabs = props.tabs || [];

        if (Array.isArray(tabs)) {
          result = {};
          tabs.forEach((tab, index) => {
            result[String(index)] = tab;
          });
        } else {
          result = tabs;
        }
      }

      return result;
    });

    const keys = computed(() => Object.keys(children.value));

    watch(
      () => props.value,
      newValue => {
        if (internalValue.value !== newValue) {
          selected.value = internalValue.value = newValue;
        }
      }
    );

    watch(
      [children, () => props.value],
      () => {
        if (
          internalValue.value === undefined ||
          children.value[internalValue.value] === undefined
        ) {
          const firstKey = keys.value[0];
          if (firstKey) {
            internalValue.value = firstKey;
            emit('input', firstKey);
          }
        }

        if (
          selected.value !== internalValue.value &&
          selected.value !== undefined &&
          children.value[selected.value] !== undefined
        ) {
          internalValue.value = selected.value;
          emit('input', selected.value);
        }
      },
      { immediate: true }
    );

    const handleTabClick = (key: string) => {
      internalValue.value = key;
      selected.value = key;
      emit('input', key);
    };

    return {
      internalValue,
      children,
      keys,
      handleTabClick,
      fullWidth: computed(() => props.fullWidth),
      tabClass: computed(() => props.tabClass)
    };
  },
  render(createElement: CreateElement): VNode {
    return createElement(
      'div',
      {
        staticClass: `${this.tabClass} ${this.fullWidth ? 'nav-justified' : ''}`
      },
      [
        createElement('ul', { staticClass: `nav ${this.tabClass}` }, [
          this.keys.map((key: string) =>
            createElement('li', { staticClass: 'nav-item' }, [
              createElement(
                'a',
                {
                  attrs: { href: '#' },
                  staticClass: 'nav-link',
                  class: { active: this.internalValue === key },
                  on: { click: () => this.handleTabClick(key) }
                },
                [this.children[key]!]
              )
            ])
          ),
          ...(this.fullWidth
            ? []
            : [createElement('div', { staticClass: 'nav-tab-spacer' })])
        ])
      ]
    );
  }
});

export default Tabs;
