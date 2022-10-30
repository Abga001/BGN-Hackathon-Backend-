import mongoose from 'mongoose'
                          
const postsModel = mongoose.Schema({
    user: String,
    imgName: String,
    text: String,
    avatar: String,
    timestamp: String,
    country: String
})
export default mongoose.model('posts', postsModel)