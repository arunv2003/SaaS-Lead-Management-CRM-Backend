import mongoose from "mongoose";

const plansSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    leadLimit:{
        type:Number,
        required:true,
    },
    userLimit:{
        type:Number,
        required:true,
    },
},{timestamps:true})

export const PlansModel=mongoose.model("plans",plansSchema)