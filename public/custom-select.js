(() => {
    function enhance(select) {
        const wrapper = document.createElement("div");
        wrapper.className = "custom-select";
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "custom-select-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        const list = document.createElement("div");
        list.className = "custom-select-options";
        list.setAttribute("role", "listbox");
        list.hidden = true;

        function close() {
            wrapper.classList.remove("open");
            list.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }
        function render() {
            const selected = select.options[select.selectedIndex] || select.options[0];
            trigger.textContent = selected?.textContent || "Selecione";
            trigger.disabled = select.disabled;
            list.replaceChildren();
            for (const option of select.options) {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "custom-select-option";
                item.textContent = option.textContent;
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", String(option.value === select.value));
                if (option.value === select.value) item.classList.add("selected");
                item.addEventListener("click", () => {
                    select.value = option.value;
                    select.dispatchEvent(new Event("change", { bubbles: true }));
                    render(); close(); trigger.focus();
                });
                list.append(item);
            }
        }
        trigger.addEventListener("click", () => {
            const willOpen = list.hidden;
            document.querySelectorAll(".custom-select.open").forEach(element => {
                if (element !== wrapper) element.querySelector(".custom-select-trigger")?.click();
            });
            list.hidden = !willOpen;
            wrapper.classList.toggle("open", willOpen);
            trigger.setAttribute("aria-expanded", String(willOpen));
        });
        select.addEventListener("change", render);
        new MutationObserver(render).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
        select.classList.add("native-select-hidden");
        select.setAttribute("aria-hidden", "true");
        select.tabIndex = -1;
        select.insertAdjacentElement("afterend", wrapper);
        wrapper.append(trigger, list);
        render();
    }
    document.querySelectorAll(".categorias select, select[data-custom-select]").forEach(enhance);
    document.addEventListener("click", event => {
        document.querySelectorAll(".custom-select.open").forEach(wrapper => {
            if (!wrapper.contains(event.target)) wrapper.querySelector(".custom-select-trigger")?.click();
        });
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") document.querySelectorAll(".custom-select.open .custom-select-trigger").forEach(button => button.click());
    });
})();
