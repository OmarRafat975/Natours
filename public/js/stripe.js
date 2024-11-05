/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51QHQEC07Tc3drZceeAIgwSdIpViBlmDroYBtNIsGlNFQKpAAH4oWLozV0MrHGXSwlvdo7oK4ekOBkrfwM6pzuwSV00o4A3yC3c',
  );
  try {
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );

    window.location.assign(session.data.session.url);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
