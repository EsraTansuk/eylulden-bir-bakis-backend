// controllers/contactController.js
const Contact = require('../models/Contact');

// @desc    İletişim bilgilerini getir
// @route   GET /api/admin/contact
// @access  Private (JWT)
const getContact = async (req, res) => {
  try {
    // Tek bir contact kaydı olmalı, yoksa oluştur
    let contact = await Contact.findOne();
    
    if (!contact) {
      contact = await Contact.create({});
    }
    
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    İletişim bilgilerini güncelle
// @route   PUT /api/admin/contact
// @access  Private
const updateContact = async (req, res) => {
  try {
    const { 
      address, 
      phone, 
      email, 
      socialMediaLinks, 
      mapCoordinates,
      workingHours 
    } = req.body;
    
    // Tek bir contact kaydı olmalı
    let contact = await Contact.findOne();
    
    if (!contact) {
      // Yoksa oluştur
      contact = await Contact.create({});
    }
    
    // Güncelleme
    if (address !== undefined) {
      contact.address = address.trim();
    }
    
    if (phone !== undefined) {
      contact.phone = phone.trim();
    }
    
    if (email !== undefined) {
      contact.email = email.trim().toLowerCase();
    }
    
    if (workingHours !== undefined) {
      // Boş string veya null ise boş string olarak kaydet
      contact.workingHours = workingHours ? workingHours.trim() : '';
    }
    
    if (mapCoordinates !== undefined) {
      if (mapCoordinates === null) {
        contact.mapCoordinates = { latitude: null, longitude: null };
      } else {
        contact.mapCoordinates = {
          latitude: mapCoordinates.latitude || null,
          longitude: mapCoordinates.longitude || null
        };
      }
    }
    
    if (socialMediaLinks !== undefined) {
      let processedLinks = [];
      if (Array.isArray(socialMediaLinks)) {
        processedLinks = socialMediaLinks
          .filter(link => link && link.platform && link.url)
          .map(link => ({
            platform: link.platform.trim(),
            url: link.url.trim()
          }));
      } else if (typeof socialMediaLinks === 'string') {
        try {
          const parsed = JSON.parse(socialMediaLinks);
          if (Array.isArray(parsed)) {
            processedLinks = parsed
              .filter(link => link && link.platform && link.url)
              .map(link => ({
                platform: link.platform.trim(),
                url: link.url.trim()
              }));
          }
        } catch (e) {
          // String parse edilemezse boş bırak
        }
      }
      contact.socialMediaLinks = processedLinks;
    }
    
    await contact.save();
    
    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    İletişim bilgilerini sil (tüm bilgileri sıfırla)
// @route   DELETE /api/admin/contact
// @access  Private
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOne();
    
    if (!contact) {
      return res.status(404).json({ message: 'İletişim bilgisi bulunamadı' });
    }
    
    // Tüm bilgileri sıfırla
    contact.address = '';
    contact.phone = '';
    contact.email = '';
    contact.socialMediaLinks = [];
    contact.mapCoordinates = { latitude: null, longitude: null };
    contact.workingHours = '';
    
    await contact.save();
    
    res.json({ 
      message: 'İletişim bilgileri sıfırlandı',
      contact 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getContact,
  updateContact,
  deleteContact
};

