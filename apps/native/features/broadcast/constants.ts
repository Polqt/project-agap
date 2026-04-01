export const broadcastTemplates = [
  {
    broadcastType: "evacuate_now" as const,
    message: "Immediate evacuation is advised. Proceed to the nearest open evacuation center now.",
    messageFilipino: "Kailangang lumikas agad. Pumunta na sa pinakamalapit na bukas na evacuation center.",
  },
  {
    broadcastType: "stay_alert" as const,
    message: "Stay alert and keep your phones charged. Follow official updates from the barangay.",
    messageFilipino: "Manatiling alerto at siguraduhing may charge ang inyong telepono. Hintayin ang opisyal na abiso ng barangay.",
  },
  {
    broadcastType: "all_clear" as const,
    message: "All clear for now. Continue monitoring Agap for any change in instructions.",
    messageFilipino: "Ligtas na sa ngayon. Patuloy pa ring bantayan ang Agap para sa susunod na abiso.",
  },
];
