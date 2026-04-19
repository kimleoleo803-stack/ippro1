package com.livetv.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.livetv.app.nativeplayer.NativePlayerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
