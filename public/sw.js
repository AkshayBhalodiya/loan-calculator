self.addEventListener("push", function (event) {
  let data = {
    title: "LoanWise Prepayment Alert",
    body: "You have a new prepayment strategy update!",
    icon: "/file.svg"
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "LoanWise Prepayment Alert",
        body: event.data.text(),
        icon: "/file.svg"
      };
    }
  }

  const options = {
    body: data.body || "New alert from your team.",
    icon: data.icon || "/file.svg",
    badge: "/file.svg",
    data: data.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "LoanWise", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow("/dashboard");
      }
    })
  );
});
