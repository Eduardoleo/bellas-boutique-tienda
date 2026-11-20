const express=require('express');
const router=express.Router();
const {asyncRoute}=require('../utils/httpErrors');
const {authMiddleware}=require('../middleware/authMiddleware');
const Shipment=require('../models/shipmentModel');
const publicShipment=s=>Object.fromEntries(['tracking_number','status','estimated_delivery','central_at','mensajero_at','en_camino_at','entregado_at'].map(key=>[key,s[key]]));
const publicHistory=history=>history.map(row=>({status:row.status,created_at:row.created_at}));
router.get('/:trackingNumber/private',authMiddleware,asyncRoute(async(req,res)=>{
 const s=await Shipment.getShipmentByTracking(req.params.trackingNumber);
 if(!s||s.owner_id!==req.userId)return res.status(404).json({success:false,message:'Envío no encontrado'});
 return res.json({success:true,shipment:{...publicShipment(s),shipping_address:s.shipping_address,recipient_name:s.recipient_name,recipient_phone:s.recipient_phone,delivery_notes:s.delivery_notes},history:publicHistory(await Shipment.getShipmentHistory(s.id))});
}));
router.get('/:trackingNumber',asyncRoute(async(req,res)=>{
 const s=await Shipment.getShipmentByTracking(req.params.trackingNumber);
 if(!s)return res.status(404).json({success:false,message:'Número de seguimiento no encontrado'});
 return res.json({success:true,shipment:publicShipment(s),history:publicHistory(await Shipment.getShipmentHistory(s.id))});
}));
module.exports=router;
