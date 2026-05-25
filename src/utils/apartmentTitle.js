function buildApartmentTitle({ rooms, neighborhood, address }) {
  const roomsText = rooms ? `${rooms} חדרים` : "דירה";
  const neighborhoodText = neighborhood ? `ב${neighborhood}` : "";
  const addressText = address ? ` (${address})` : "";
  return `דירת ${roomsText} ${neighborhoodText}`.trim() + addressText;
}

module.exports = {
  buildApartmentTitle,
};
