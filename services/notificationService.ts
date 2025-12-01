export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações de desktop");
    return;
  }

  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    await Notification.requestPermission();
  }
};

export const sendNotification = (title: string, body: string, icon?: string) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: icon || undefined,
        requireInteraction: false // Set to true if you want it to stick until clicked
      });
    } catch (e) {
      console.error("Erro ao enviar notificação:", e);
    }
  }
};