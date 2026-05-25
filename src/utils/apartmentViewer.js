function mapApartmentForViewer(apartment, hasFullAccess) {
  if (hasFullAccess) {
    return apartment;
  }

  return {
    ...apartment,
    contact_name: null,
    contact_phone: null,
    contact_email: null,
  };
}

module.exports = {
  mapApartmentForViewer,
};
