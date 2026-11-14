import Settings from "../models/SettingsModel.js";


// Get current settings
export const getSettings = async (req, res) => {
  try {
    // Get the most recent settings document
    let settings = await Settings.findOne().sort({ updatedAt: -1 });
    
    // If no settings exist, create default settings
    if (!settings) {
      const defaultSlots = [
        '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
        '12:00 PM - 01:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM',
        '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM'
      ];

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayWiseSettings = {};
      
      daysOfWeek.forEach(day => {
        dayWiseSettings[day] = {
          isActive: true,
          useGlobalSettings: true,
          customSlots: defaultSlots.map(slot => ({
            timeSlot: slot,
            capacity: 5,
            isActive: true
          }))
        };
      });

      settings = await new Settings({
        slotSettings: {
          globalSlots: defaultSlots.map(slot => ({
            timeSlot: slot,
            capacity: 5,
            isActive: true
          })),
          dayWiseSettings,
          dateSpecificSettings: []
        },
        pricingSettings: {
          baseCharge: 3000,
          gstRate: 18,
          gstAmount: 540,
          totalAmount: 3540
        }
      }).save();
    }
    
    return res.send({
      message: "Settings retrieved successfully",
      settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).send({
      message: "Server error",
      error: error.message
    });
  }
};

// Save/Update settings
export const saveSettings = async (req, res) => {
  try {
    const { slotSettings, pricingSettings } = req.body;
    
    // Validate required fields
    if (!slotSettings || !pricingSettings) {
      return res.status(400).send({
        message: "Slot settings and pricing settings are required"
      });
    }

    // Get the current settings
    let settings = await Settings.findOne().sort({ updatedAt: -1 });
    
    if (settings) {
      // Update existing settings
      settings.slotSettings = slotSettings;
      settings.pricingSettings = pricingSettings;
      await settings.save();
    } else {
      // Create new settings
      settings = await new Settings({
        slotSettings,
        pricingSettings
      }).save();
    }
    
    return res.send({
      message: "Settings saved successfully",
      settings
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return res.status(500).send({
      message: "Server error",
      error: error.message
    });
  }
};

// Get available slots for a specific date
export const getAvailableSlotsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).send({
        message: "Date is required"
      });
    } 

    const settings = await Settings.findOne().sort({ updatedAt: -1 });
    
    if (!settings) {
      return res.status(404).send({
        message: "Settings not found"
      });
    }

    const dateObj = new Date(date);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    
    let availableSlots = [];

    // Check for date-specific settings first
    const dateSpecific = settings.slotSettings.dateSpecificSettings.find(
      ds => new Date(ds.date).toISOString().split('T')[0] === date
    );

    if (dateSpecific) {
      // Use date-specific settings
      availableSlots = dateSpecific.slots.filter(slot => slot.isActive);
    } else {
      // Check day-wise settings
      const daySettings = settings.slotSettings.dayWiseSettings[dayOfWeek];
      
      if (!daySettings || !daySettings.isActive) {
        // Day is not active
        return res.send({
          message: "No slots available for this day",
          slots: []
        });
      }

      if (daySettings.useGlobalSettings) {
        // Use global settings
        availableSlots = settings.slotSettings.globalSlots.filter(slot => slot.isActive);
      } else {
        // Use day-specific custom settings
        availableSlots = daySettings.customSlots.filter(slot => slot.isActive);
      }
    }

    // TODO: Subtract already booked slots from capacity
    // This would require querying the Booking collection for this date
    
    return res.send({
      message: "Available slots retrieved successfully",
      slots: availableSlots,
      dayOfWeek
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    return res.status(500).send({
      message: "Server error",
      error: error.message
    });
  }
};