import Offer from "../models/Offer.js";

/**
 * The two people on a job: the client who posted it and the provider whose
 * offer was accepted. Ids come back as strings; providerId is null while no
 * offer has been accepted.
 */
export async function getJobParticipants(job) {
  const offer = job.acceptedOfferId ? await Offer.findById(job.acceptedOfferId) : null;
  return { clientId: job.clientId.toString(), providerId: offer ? offer.providerId.toString() : null };
}
