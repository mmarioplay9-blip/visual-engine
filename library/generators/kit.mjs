export const color = (name, def, description) => ({ name, type: 'color', default: def, description });
export const num = (name, def, description, min = 0, max = 100, step = 1) => ({
  name,
  type: 'number',
  default: def,
  description,
  min,
  max,
  step,
});
export const bool = (name, def, description) => ({ name, type: 'boolean', default: def, description });
export const text = (name, def, description) => ({ name, type: 'string', default: def, description });

export const COMMON = [
  color('bg', '#05070d', 'Fondo base'),
  color('accent', '#12e0c8', 'Acento frío'),
  color('accent2', '#ffb454', 'Acento cálido'),
  num('speed', 1, 'Velocidad de la animación', 0, 4, 0.05),
];
