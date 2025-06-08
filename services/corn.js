const cron = require('node-cron');
const { Reservation } = require('../models/Reservation');

module.exports.startReservationCleanup = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const expiredReservations = await Reservation.find({
                status: "pending",
                createdAt: { $lt: oneHourAgo }
            })


            for (const reservation of expiredReservations) {
                await Reservation.findByIdAndDelete(reservation._id);
            }
            console.log(`Cleaned up ${expiredReservations.length} expired reservations.`);

        } catch (error) {
            console.error('Error cleaning up reservations:', error);

        }
    })
}