export let currentInstance = null;

export function renderInstance(instance) {
  currentInstance = instance;
  let tree = instance.render(instance);
  currentInstance = null;
  return tree;
};