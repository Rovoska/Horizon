<template>
  <div ref="menu">
    <custom-context-menu
      id="channelGroupMenu"
      :menu-items="channelMenuItems"
      style="display: block; min-width: 220px; z-index: 1100"
    >
      <div class="list-group-item" id="channelGroupMenu-header">
        <span class="fas fa-fw fa-folder"></span>
        <span class="userInfo-name">{{ channelGroup?.name }}</span>
      </div>
    </custom-context-menu>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import { Conversation } from './interfaces';
  import CustomContextMenu, {
    ContextMenuItemProps
  } from '../components/CustomContextMenu.vue';
  import l from './localize';
  import { Dialog } from '../helpers/dialog';

  export default Vue.extend({
    name: 'ChannelGroupMenu',
    components: {
      CustomContextMenu
    },
    data() {
      return {
        l,
        showMenu: false,
        position: {} as { left: string; top: string },
        channelGroup: null as Conversation.ChannelGroup | null,
        currentGroupId: null as string | null,
        groups: [] as Conversation.ChannelGroup[]
      };
    },
    computed: {
      channelMenuItems(): ContextMenuItemProps[] {
        const items: ContextMenuItemProps[] = [
          {
            label: l('channelGroup.menu.markRead'),
            iconClass: 'fas fa-fw fa-check-double',
            onClick: () => {
              this.markAsRead();
            }
          },
          {
            label: l('action.rename'),
            iconClass: 'fas fa-fw fa-edit',
            onClick: () => {
              this.renameGroup();
            }
          },
          {
            label: l('channelGroup.menu.moveUp'),
            iconClass: 'fas fa-fw fa-arrow-up',
            disabled: this.groups.length <= 1,
            onClick: () => {
              //tbd
            }
          },
          {
            label: l('channelGroup.menu.moveDown'),
            iconClass: 'fas fa-fw fa-arrow-down',
            disabled: this.groups.length <= 1,
            onClick: () => {
              //tbd
            }
          },
          ...(this.groups.length > 1
            ? [
                {
                  label: l('channelGroup.menu.merge'),
                  iconClass: 'fas fa-fw fa-compress',
                  children: this.groups
                    .filter(g => g.id !== this.currentGroupId)
                    .map(g => ({
                      label: g.name,
                      onClick: () => {
                        this.mergeGroup(g.id);
                      }
                    }))
                }
              ]
            : this.groups.length === 1
              ? [
                  {
                    label: l(
                      'channelGroup.menu.merge.single',
                      this.channelGroup?.name || ''
                    ),
                    iconClass: 'fas fa-fw fa-compress',
                    onClick: () => {
                      this.mergeGroup(this.groups[0].id);
                    }
                  }
                ]
              : []),
          {
            label: l('channel.group.delete'),
            iconClass: 'fas fa-fw fa-trash',
            dangerous: true,
            onClick: () => {
              if (
                Dialog.confirmDialog(
                  l(
                    'channelGroup.menu.delete.confirm',
                    this.channelGroup?.name || ''
                  )
                )
              ) {
                // Implementation here
              }
            }
          }
        ];
        return items;
      }
    },
    methods: {
      markAsRead() {
        //tbd
      },
      renameGroup() {
        //tbd
      },
      mergeGroup(_groupId: string) {
        //tbd
      }
    }
  });
</script>
