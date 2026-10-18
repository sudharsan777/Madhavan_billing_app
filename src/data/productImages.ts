import { ImageSourcePropType } from 'react-native';

/**
 * Local high-resolution, verified product images from src/data/newimages/.
 * These connect each product to its matching custom photograph with consistent
 * sizing, cropping, and instant 0ms offline bundling.
 */
export const LOCAL_PRODUCT_IMAGES: Record<string, ImageSourcePropType> = {
  // 1. Chicken Bread Omelette
  'bo-3': require('./newimages/Chicken-Bread-Omelette.png'),

  // 2. Fish Finger (2pcs & 4pcs)
  'fc-6': require('./newimages/Fish-Finger.png'),
  'fc-7': require('./newimages/Fish-Finger.png'),

  // 3. Crab Lollipop (2pcs & 4pcs)
  'fc-10': require('./newimages/Crab-Lollipop.png'),
  'fc-11': require('./newimages/Crab-Lollipop.png'),

  // 4. French Fries (Salted)
  'fc-12': require('./newimages/French-Fries-(Salted).png'),

  // 5. Strawberry Ice Cream Scoop
  'ic-2': require('./newimages/Strawberry.png'),

  // 6. Tender Apple Shake
  'ts-4': require('./newimages/Tender-Apple.png'),

  // 7. Pista Lassi
  'ls-5': require('./newimages/Pista-Lassi.png'),

  // 8. Butterscotch Lassi
  'ls-4': require('./newimages/Butterscotch-Lassi.png'),

  // 9. Amla Juice
  'fj-1': require('./newimages/Amla-Juice-Real.png'),

  // 10. Apple Juice
  'fj-3': require('./newimages/Apple-Juice.png'),

  // 11. Pomegranate Juice
  'fj-5': require('./newimages/Pomegranate-Juice.png'),

  // 12. Papaya Juice
  'fj-10': require('./newimages/Papaya-Juice.png'),

  // 13. Dragon Fruit Juice
  'fj-12': require('./newimages/Dragon-Fruit-Juice.png'),

  // 14. Avocado Juice
  'fj-13': require('./newimages/Avocado-Juice.png'),

  // 15. Cucumber Juice
  'fj-15': require('./newimages/Cucumber-Juice.png'),

  // 16. Hariyali BBQ (Full)
  'bbq-3': require('./newimages/Hariyali-BBQ-(Full).png'),

  // 17. Classic Tikka
  'bbq-7': require('./newimages/Classic-Tikka.png'),

  // 18. Hariyali BBQ
  'bbq-9': require('./newimages/Hariyali.png'),

  // 19. Normal Shawarma Roll
  'sh-2': require('./newimages/Normal-Shawarma.png'),

  // 20. Shawarma Plate
  'sh-5': require('./newimages/Shawarma-Plate.png'),

  // 21. Peri Peri Plate Shawarma
  'sh-6': require('./newimages/Peri-Peri-Plate-Shawarma.png'),
};

/**
 * Returns either the local bundled asset image or the remote URI object.
 */
export function getProductImageSource(
  id: string,
  remoteUrl?: string
): ImageSourcePropType | { uri: string } | null {
  if (LOCAL_PRODUCT_IMAGES[id]) {
    return LOCAL_PRODUCT_IMAGES[id];
  }
  if (remoteUrl && typeof remoteUrl === 'string' && remoteUrl.trim().length > 0) {
    return { uri: remoteUrl };
  }
  return null;
}
