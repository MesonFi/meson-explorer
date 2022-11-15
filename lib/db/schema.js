import mongoose from 'mongoose'

const EventsSchema = mongoose.Schema({
  name: String,
  hash: String,
  recipient: String
}, { _id: false })

export const SwapSchema = new mongoose.Schema({
  _id: String,
  encoded: String,
  v: Number,
  events: {
    type: [EventsSchema],
    default: []
  },
  inChain: String,
  inToken: Number,
  initiator: String,
  fromTo: [String],
  outChain: String,
  outToken: Number,
  amount: Number,
  lpFee: Number,
  srFee: Number,
  salt: String,
  expireTs: Date,
  provider: {
    type: String,
    default: ''
  },
  signature: {
    type: Array,
    default: () => undefined
  },
  releaseSignature: {
    type: Array,
    default: () => undefined
  },
  created: { type: Date, index: true },
  posted: Date,
  bonded: Date,
  locked: Date,
  unlocked: Date,
  releasing: Date,
  executed: Date,
  released: Date,
  cancelled: Date,
  disabled: Boolean,
  hide: Boolean
}, {
  timestamps: { createdAt: 'created', updatedAt: 'updated' }
})

export const SwapFailsSchema = new mongoose.Schema({
  fails: Number,
  duration: Number,
  restart: Boolean,
  ts: { type: Date, expires: '5d' },
})

export const RulesSchema = new mongoose.Schema({
  priority: Number,
  initiator: String,
  from: {
    type: String,
    default: '*'
  },
  to: {
    type: String,
    default: '*'
  },
  fee: {
    type: Array,
    default: []
  },
  limit: Number
})

export const FeeWaiveSchema = new mongoose.Schema({
  _id: String,
  date: { type: Date, expires: '3d' },
  initiator: String,
  waived: { type: Number, default: 0 },
  swaps: { type: Number, default: 0 }
})

export const PremiumSchema = new mongoose.Schema({
  _id: String,
  initiator: String,
  hash: { type: String, unique: true },
  paid: Number,
  used: { type: Number, default: 0 },
  quota: { type: Number, default: 0 },
  since: Date,
  until: Date,
  hide: Boolean,
  meta: Object,
  params: Object,
})
PremiumSchema.path('since').get(d => d && Math.floor(d.valueOf() / 1000))
PremiumSchema.path('until').get(d => d && Math.floor(d.valueOf() / 1000))
PremiumSchema.set('toJSON', { getters: true, virtuals: false })

export const ShareSchema = new mongoose.Schema({
  _id: String,
  address: String,
  n: Number,
  seq: Number,
})

const BannerMetaSchema = mongoose.Schema({
  address: String,
}, { _id: false })

export const BannerSchema = new mongoose.Schema({
  text: String,
  address: [String],
  meta: [BannerMetaSchema],
})
