import sourceGameData from '../../gameData.json';

const PUBLIC_ASSET_PREFIXES = [
  '/gallery/',
  '/marketplace/',
  '/wallpaper-',
];

function resolvePublicAssetPath(value) {
  if (typeof value === 'string') {
    const isPublicAsset = PUBLIC_ASSET_PREFIXES.some((prefix) => value.startsWith(prefix));
    if (isPublicAsset) {
      return `${import.meta.env.BASE_URL}${value.slice(1)}`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(resolvePublicAssetPath);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolvePublicAssetPath(item)])
    );
  }

  return value;
}

const gameData = resolvePublicAssetPath(sourceGameData);

export default gameData;
