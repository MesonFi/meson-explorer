import mongoose from 'mongoose'

const EventsSchema = mongoose.Schema({
  name: String,
  hash: String,
  recipient: String
}, { _id: false })

export const SwapSchema = new mongoose.Schema({
  _id: String,
  encoded: String,
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

export const QueueSchema = new mongoose.Schema({
  key: String,
  expiresAt: Date,
  value: String,
})

export const RulesSchema = new mongoose.Schema({
  priority: Number,
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
    default: [0]
  },
  limit: {
    type: Number,
    default: 0
  }
})

export const FeeWaiveSchema = new mongoose.Schema({
  _id: String,
  date: { type: Date, expires: '3d' },
  initiator: String,
  waived: { type: Number, default: 0 },
  swaps: { type: Number, default: 0 }
})

export const ShareSchema = new mongoose.Schema({
  _id: String,
  address: { type: String, unique: true, sparse: true },
  n: { type: Number, default: 0 },
  seq: { type: Number, default: 0 },
})

export const ShareCodeSchema = new mongoose.Schema({
  _id: String,
  code: String,
  style: String,
  encoded: String,
  duration: Number,
  locale: String,
  style: String,
  n: { type: Number, default: 0 },
  expires: { type: Date, expires: '1s' },
  meta: Object,
})
