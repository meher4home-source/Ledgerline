/* Ledgerline site settings. Edit this file only; no rebuild needed. Keep everything TRUE. */
window.LLSITE={
 operator:{
  legalName:"",            // your legal / proprietor name, once you want it shown
  businessType:"",         // e.g. "Sole proprietorship". Leave empty until true.
  address:"",              // shown in the footer when filled
  email:"",                // falls back to SUPPORT_EMAIL in config.js
  phone:"",
  jurisdiction:""          // used in contract templates, e.g. "courts at Sambalpur, Odisha"
 },
 // Add ONLY registrations you hold and can show proof of. Example: {label:"Udyam registration",value:"UDYAM-..."}
 registrations:[],
 // Keep in sync with PR in app.html (these are the prices the app shows today).
 plans:{
  in:{name:"India",cur:"₹",p:[299,1499,4999]},us:{name:"United States",cur:"$",p:[9,49,149]},uk:{name:"United Kingdom",cur:"£",p:[8,39,119]},
  ca:{name:"Canada",cur:"C$",p:[12,65,199]},au:{name:"Australia",cur:"A$",p:[14,75,229]},ae:{name:"UAE",cur:"AED ",p:[35,179,549]},
  sg:{name:"Singapore",cur:"S$",p:[12,65,199]},gl:{name:"Other countries",cur:"$",p:[9,49,149]}},
 // Bulk prices are your PROPOSED starting prices, not validated. They stay hidden until showBulkPrices is true.
 showBulkPrices:false,
 bulk:[
  {businesses:25,label:"Paid pilot",price:15000,period:"pilot"},
  {businesses:100,label:"100 businesses",price:200000,period:"annual"},
  {businesses:500,label:"500 businesses",price:800000,period:"annual"},
  {businesses:1000,label:"1,000 businesses",price:1500000,period:"annual"}]
};
