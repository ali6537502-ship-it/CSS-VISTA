import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consultationFeeLabel,
  consultationSettings,
  consultationWhatsAppLink,
  mentorConsultations,
  type ConsultationMentorId,
} from '../src/data/consultations.ts'

test('all consultation bookings use the official centralized WhatsApp number', () => {
  assert.equal(consultationSettings.bookingNumber, '923166050195')
  for (const mentorId of ['ali', 'sadia'] as ConsultationMentorId[]) {
    assert.match(consultationWhatsAppLink(mentorId), /^https:\/\/wa\.me\/923166050195\?text=/)
  }
})

test('each WhatsApp message identifies the selected mentor and requests real booking details', () => {
  const aliMessage = decodeURIComponent(consultationWhatsAppLink('ali').split('?text=')[1] ?? '')
  const sadiaMessage = decodeURIComponent(consultationWhatsAppLink('sadia').split('?text=')[1] ?? '')
  assert.match(aliMessage, /Sir Ali Hassan/)
  assert.match(sadiaMessage, /Ms\. Sadia Zahoor/)
  assert.match(aliMessage, /available schedule, and consultation fee/)
  assert.match(sadiaMessage, /available schedule, and consultation fee/)
})

test('no fee is invented while centralized fee fields are empty', () => {
  for (const config of Object.values(mentorConsultations)) {
    assert.equal(config.fee, '')
    assert.equal(consultationFeeLabel(config), 'Contact for details')
  }
})
