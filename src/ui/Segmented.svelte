<script lang="ts" generics="T extends string | number">
  let { options, value = $bindable(), label }: { options: { value: T; label: string }[]; value: T; label: string } = $props();
  const name = `seg-${Math.random().toString(36).slice(2)}`;
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    <label class="seg-i" class:on={value === o.value}>
      <input type="radio" {name} checked={value === o.value} onchange={() => (value = o.value)} />
      {o.label}
    </label>
  {/each}
</div>
