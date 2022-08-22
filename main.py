import gi

gi.require_version('Gst', '1.0')
gi.require_version('Gtk', '3.0')
from gi.repository import Gst, Gtk
from datetime import datetime

filename = datetime.now().strftime("%Y%m%d-%H%M%S")


class Plugin:
    # A normal method. It can be called from JavaScript using call_plugin_function("method_1", argument1, argument2)
    async def add(self, left, right):
        return left + right


    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):self.player = Gst.parse_launch("pipewiresrc ! videoscale ! videoconvert ! vaapih264enc bitrate=6000 "
                                       "quality-level=1 ! h264parse ! flvmux ! filesink "
                                       "location=/home/deck/Videos/SOSRec_.mkv")
        bus = self.player.get_bus()
        bus.add_signal_watch()
        bus.enable_sync_message_emission()
        bus.connect("message", self.on_message)
        bus.connect("sync-message::element", self.on_sync_message)
        pass
