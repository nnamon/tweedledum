<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    icon,
    colour = 'blue',
    title,
    sub = '',
    value = '',
    onclick,
  }: { icon?: string; colour?: string; title: string; sub?: string; value?: string; onclick: () => void } = $props();
</script>

<button class="row" {onclick}>
  {#if icon}<span class="ic" style:background={`var(--tw-ic-${colour})`}><Icon name={icon} size={18} /></span>{/if}
  <span class="row-main">
    <span class="row-title">{title}</span>
    {#if sub}<span class="row-sub">{sub}</span>{/if}
  </span>
  {#if value}<span class="row-value">{value}</span>{/if}
  <span class="row-chevron"><Icon name="chevron" size={13} /></span>
</button>
